(() => {
  // ../../Desktop/2.0/DS2.0/Untitled/packages/klear360/src/components/Spark/KlearGlass/klearGlassShader.ts
  var klearGlassVertexShader = (
    /* glsl */
    `
precision mediump float;

attribute vec2 position;
attribute vec2 uv;

// Zoom & Pan uniforms (computed in vertex shader for efficiency)
uniform float uZoom;
uniform vec2 uPan;  // vec2(uPanX, uPanY)

// Output varyings
varying vec2 vUv;           // Raw screen UV (for screen-space effects like feathering)
varying vec2 vContentUv;    // Transformed UV for video/content sampling (zoom + pan applied)

void main() {
    // Raw screen UV for screen-space effects
    vUv = uv;

    // Compute zoomed/panned UV for content sampling
    // Zoom: scale around center (0.5, 0.5)
    // Pan: offset the view
    vContentUv = (uv - 0.5) / uZoom + 0.5;
    vContentUv += uPan;

    gl_Position = vec4(position, 0, 1);
}
`
  );
  var klearGlassFragmentShader = (
    /* glsl */
    `
precision mediump float;

uniform float uTime;
uniform vec2 iResolution;
uniform float uDpr;
uniform sampler2D uVideoTexture;
uniform sampler2D uGradientMap;
uniform sampler2D uGradientMap2;       // Second gradient map for cross-fade blending
uniform sampler2D uCenterGradientMap;  // Separate gradient map for center ellipse

// Layer toggles (enable/disable actual effects)
uniform float uEnableDisplacement;
uniform float uEnableColorama;
uniform float uEnableBloom;
uniform float uEnableLightSweep;

// ============================================
// COLORAMA UNIFORMS (Adobe AE v5 Pipeline)
// Pipeline: Scalar \u2192 Remap \u2192 Warp \u2192 Wrap \u2192 Lookup \u2192 Blend
// ============================================

// --- 1. INPUT PHASE (Scalar Index Generation) ---
uniform float uInputMin;          // Input range min (default 0.0)
uniform float uInputMax;          // Input range max (default 1.0)

// --- 2. MODIFY PHASE (Index Space Warping) ---
uniform float uModifyGamma;       // Gamma curve: <1 = brights, >1 = darks (default 1.0)
uniform float uPosterizeLevels;   // 0 = off, >0 = number of discrete steps
uniform float uCycleRepetitions;  // Stretch/compress the index (default 1.0)
uniform float uPhaseShift;        // Static offset (default 0.0)
uniform float uCycleSpeed;        // Cycling animation speed (default 0.0)

// --- 3. OUTPUT CYCLE (Wrap & Lookup) ---
uniform float uWrapMode;          // 0 = clamp, 1 = wrap/fract (default 1.0)
uniform float uReverse;           // 0 = normal, 1 = reverse gradient (default 0.0)

// --- 4. COMPOSITE ---
uniform float uBlendWithOriginal;    // 0 = full effect, 1 = original (default 0.0)
uniform float uGradientMapBlend;     // 0 = uGradientMap, 1 = uGradientMap2 (default 0.0)

// --- 5. LIGHT EFFECT ---
uniform float uLightIntensity;    // Strength of light sweep effect
uniform vec3 uSpecularTint;       // Tint for center specular highlight (default vec3(1.0) = white)
uniform float uFrameCount;        // Current frame number
uniform float uLightStartFrame;   // Frame when light effect starts

// --- 6. DISPLACEMENT ---
uniform float uNumSegments;       // Number of glass slits (default 45.0)
uniform float uSlitAngle;         // Angle of slits in radians (default 0.13)
uniform float uDisplacementX;     // X displacement amount (default -12.0)
uniform float uDisplacementY;     // Y displacement amount (default -20.0)

// --- 7. CENTER ELEMENT ---
uniform float uEnableCenterElement;    // Toggle center element (0 = off, 1 = on)
uniform float uCenterAnimDuration;     // Duration of one animation cycle in seconds
uniform float uCenterAnimTime;         // Current animation time in seconds (resets with video loop)

// --- 8. COLOR CORRECTION ---
uniform float uCCBlackPoint;     // Levels black point (default 0.0)
uniform float uCCWhitePoint;     // Levels white point (default 1.0)
uniform float uCCMidtoneGamma;   // Midtone gamma (default 1.2)
uniform float uCCGamma;          // Output gamma (default 1.2)
uniform float uCCContrast;       // Contrast boost (default 0.0)

// --- 9. ZOOM & PAN ---
uniform float uZoom;             // Zoom level (1.0 = normal, 2.0 = 2x zoom) - still needed for edge feather check
uniform vec4 uEdgeFeather;       // Per-side feathering: vec4(top, right, bottom, left) clockwise, 0 = none, 1 = max
uniform vec2 uRefResolution;     // Reference resolution for zoom-independent displacement
uniform vec4 uVisibleUvBounds;   // vec4(minX, minY, maxX, maxY) - visible portion of canvas in container

// --- 10. BACKGROUND COLOR ---
uniform vec3 uBackgroundColor;   // Background color to blend with (RGB 0-1)

// UV coordinates from the vertex shader
varying vec2 vUv;                // Raw screen UV (for screen-space effects)
varying vec2 vContentUv;         // Transformed UV with zoom/pan applied (for content sampling)

// ============================================
// UTILITY FUNCTIONS
// ============================================
// Rec. 709 luminance calculation
float luminance(vec3 color) {
    return dot(color, vec3(0.2126, 0.7152, 0.0722));
}

// ============================================
// COLORAMA EFFECT (Adobe After Effects v5 Pipeline)
// ============================================
//
// Pipeline:
//   Image \u2192 Scalar Field (0-1) \u2192 Warp/Animate \u2192 Gradient Lookup \u2192 Composite
//
// This matches AE's indexed gradient remapping with time-domain cycling.
vec3 applyColoramaWithGradient(
    sampler2D gradientMap,  // Gradient map texture to sample from
    float rawIntensity,    // Raw luminance from pixel
    float inputMin,        // Input range min
    float inputMax,        // Input range max
    float gamma,           // Gamma curve (pow)
    float posterizeLevels, // 0 = off, else discrete steps
    float cycleReps,       // Cycle repetitions (stretch)
    float phaseShift,      // Static offset
    float cycleSpeed,      // Time-based cycling
    float wrapMode,        // 0 = clamp, 1 = wrap
    float reverse          // 0 = normal, 1 = flip
) {
    // \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    // STEP 1: INPUT PHASE - Scalar Index Generation
    // \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    // Normalize intensity to input range
    float t = clamp((rawIntensity - inputMin) / (inputMax - inputMin), 0.0, 1.0);

    // \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    // STEP 2: MODIFY PHASE - Index Space Warping
    // \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

    // a) Gamma / Curves - reshape the intensity distribution
    t = pow(t, gamma);

    // b) Posterize - quantize to discrete levels (branchless)
    //    When posterizeLevels <= 0, keeps t unchanged
    float posterized = floor(t * posterizeLevels + 0.0001) / max(posterizeLevels, 0.0001);
    t = mix(t, posterized, step(0.001, posterizeLevels));

    // c) Cycle Repetitions - stretch/compress across gradient
    t = t * cycleReps;

    // d) Phase Shift - static offset
    t = t + phaseShift;

    // e) Cycling Animation - time-based offset
    t = t + cycleSpeed * uTime;

    // \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    // STEP 3: OUTPUT CYCLE - Wrap & Lookup (branchless)
    // \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

    // Wrap (fract) vs Clamp - branchless selection
    t = mix(clamp(t, 0.0, 1.0), fract(t), step(0.5, wrapMode));

    // Reverse direction - branchless
    t = mix(t, 1.0 - t, step(0.5, reverse));

    // Gradient lookup (1D texture sample)
    return texture2D(gradientMap, vec2(t, 0.5)).rgb;
}

// ============================================
// DISPLACEMENT FUNCTIONS
// ============================================
// Create striped displacement map for glass refraction effect
// Returns: x = signed displacement (-1 to 1), y = local UV x position within segment
// gradientStart: gradient value at left edge (typically 1.0 for white)
// gradientEnd: gradient value at right edge (typically 0.0 for black)
// gradientPower: power curve for falloff (1.0 = linear, <1.0 = steeper, >1.0 = gentler)
// centerPoint: center value for signed conversion (typically 0.5)
// aspect: screen aspect ratio (width/height) for consistent slit angle
vec2 createStripedDisplacement(
    vec2 uv,
    float numSegments,
    float angle,
    float gradientStart,
    float gradientEnd,
    float gradientPower,
    float centerPoint,
    float aspect
) {
    // Work in aspect-corrected UV space where x and y have equal visual scale
    // This ensures consistent slit angle regardless of viewport dimensions
    vec2 aspectUV = uv * vec2(aspect, 1.0);

    // Apply slant in aspect-corrected space
    float slantedX = aspectUV.x - aspectUV.y * tan(angle);

    // Calculate segment properties (account for aspect-scaled x range)
    float segmentWidth = aspect / numSegments;
    float localUVx = fract(slantedX / segmentWidth); // 0-1 within each segment

    // Create the displacement map gradient
    // Use smoothstep for smoother interpolation
    float smoothUVx = smoothstep(0.0, 1.0, localUVx);
    // Interpolate from gradientEnd (left) to gradientStart (right)
    float rawGradient = mix(gradientEnd, gradientStart, smoothUVx);

    // Apply power curve for falloff control
    rawGradient = pow(rawGradient, gradientPower);

    // Convert to signed displacement (-1 to 1) using centerPoint
    // centerPoint is the neutral value (typically 0.5)
    float signedDisplacement = (rawGradient - centerPoint) / centerPoint;

    return vec2(signedDisplacement, localUVx);
}

// Apply displacement offset to UV coordinates
vec2 applyDisplacement(vec2 uv, float signedDisplacement, vec2 maxDisplacement, vec2 resolution) {
    vec2 displaceOffset = vec2(
        signedDisplacement * maxDisplacement.x / resolution.x,
        signedDisplacement * maxDisplacement.y / resolution.y
    );
    return uv + displaceOffset;
}

// Create thin slanted stripes with multi-stop gradient color
// Returns RGB color: gradient stripes with 3 color stops
// Stop 1 (0%): colorStart, Stop 2 (stopPosition): colorMid, Stop 3 (100%): transparent
vec4 createStripes(
    vec2 uv,
    float numSegments,
    float angle,
    float stopPosition,   // Position of middle stop (0.0 to 1.0)
    vec4 colorStart,      // Color at 0% (left edge)
    vec4 colorMid,        // Color at stopPosition
    float aspect          // Screen aspect ratio for consistent angle
) {
    // Work in aspect-corrected UV space where x and y have equal visual scale
    vec2 aspectUV = uv * vec2(aspect, 1.0);

    // Apply slant in aspect-corrected space
    float slantedX = aspectUV.x - aspectUV.y * tan(angle);

    // Calculate segment properties (account for aspect-scaled x range)
    float segmentWidth = aspect / numSegments;
    float localUVx = 1.0 - fract(slantedX / segmentWidth);  // 0-1 within each segment, reversed

    // Multi-stop gradient:
    // 0% -> colorStart (green)
    // stopPosition -> colorMid (white)
    // 100% -> transparent (black with 0 opacity)

    vec4 gradientColor;
    float opacity;

    if (localUVx < stopPosition) {
        float t = localUVx / stopPosition;
        gradientColor = mix(colorMid, colorStart, t);
        opacity = 0.5;
    } else {
        float t = (localUVx - stopPosition) / (1.0 - stopPosition);
        gradientColor = mix(vec4(0.0), colorMid, t);
        opacity = 0.5 - t * 0.5;
    }

    return gradientColor * opacity;
}

// Sample texture with displacement applied
vec4 sampleWithDisplacement(
    sampler2D tex,
    vec2 uv,
    float signedDisplacement,
    vec2 maxDisplacement,
    vec2 resolution
) {
    vec2 displacedUV = applyDisplacement(uv, signedDisplacement, maxDisplacement, resolution);
    return texture2D(tex, displacedUV);
}

// ============================================
// POST-PROCESSING EFFECTS
// ============================================
vec3 applyBloom(vec3 color, float intensity, float innerMask) {
    const float whiteCoreThresholdMin = 0.5;   // Start of white core mask
    const float whiteCoreThresholdMax = 0.85;  // End of white core mask
    const float whiteCoreBlendStrength = 0.85; // How much to blend towards pure white

    const float bloomThresholdMin = 0.3;       // Start of bloom glow
    const float bloomThresholdMax = 0.7;       // End of bloom glow
    const vec3 bloomColor = vec3(1.0, 0.99, 0.97); // Warm white bloom tint
    const float bloomStrength = 0.10;          // Intensity of bloom glow
    // -------------------------------

    // Calculate how much we're in the "center" bright area
    // Use a tighter threshold for the white core
    float whiteCoreMask = smoothstep(whiteCoreThresholdMin, whiteCoreThresholdMax, intensity) * innerMask;

    // Pure white target
    vec3 pureWhite = vec3(1.0);

    // Blend the center towards pure white (not additive, but replacement blend)
    // This ensures the very center goes to white, not gray
    color = mix(color, pureWhite, whiteCoreMask * whiteCoreBlendStrength);

    // Additional soft bloom glow around the white core
    float bloomBase = smoothstep(bloomThresholdMin, bloomThresholdMax, intensity);
    float bloomAmount = bloomBase * innerMask;
    color += bloomColor * bloomAmount * bloomStrength;

    return color;
}

// ============================================
// ANIMATED POLYGON SHAPE
// ============================================
// Struct to return shape data
struct ShapeData {
    float shape;      // The shape value (0 = outside, 1 = center)
    float gradient;   // Gradient from gray (edge) to white (center)
};

// Signed distance function for a regular polygon
// p: point to test, r: radius, n: number of sides
float sdPolygon(vec2 p, float r, float n) {
    // Angle and radius
    float an = 3.141593 / n;
    vec2 acs = vec2(cos(an), sin(an));

    // Reduce to first sector
    float bn = mod(atan(p.x, p.y), 2.0 * an) - an;
    p = length(p) * vec2(cos(bn), abs(sin(bn)));

    // Line sdf
    p -= r * acs;
    p.y += clamp(-p.y, 0.0, r * acs.y);

    return length(p) * sign(p.x);
}

// Fast signed distance function for an ellipse
// Approximation that avoids expensive acos(), cube roots, and branching
// Accurate enough for visual effects, ~5x faster than exact version
float sdEllipse(vec2 p, vec2 ab) {
    // Normalize point by ellipse radii
    vec2 q = p / ab;
    float k1 = length(q);

    // Early out for points very close to center (avoid division issues)
    if (k1 < 0.0001) return -min(ab.x, ab.y);

    // Gradient-based distance approximation
    vec2 q2 = q / ab;  // Second normalization for gradient
    float k2 = length(q2);

    return k1 * (k1 - 1.0) / k2;
}

// Helper: Calculate a single shape instance at a given animation phase
ShapeData calculateSingleShape(
    vec2 uv,
    float linearT,           // Animation phase 0-1
    float solidCoreMask,
    vec2 resolution,
    // Shape parameters
    float shapeType,
    float shapeWidth,
    float shapeHeight,
    float centerY,
    float animRange,
    float edgeSoftness,
    float grayLevel,
    float shapeAngleStart,
    float shapeAngleEnd,
    float shapeSize
) {
    // Map 0-1 to position range (left to right)
    float posOffset = (linearT * 2.0 - 1.0) * animRange;
    float centerX = 0.5 + posOffset;

    // Animate rotation
    float animatedAngle = mix(shapeAngleStart, shapeAngleEnd, linearT);

    // Correct for aspect ratio
    float aspect = resolution.x / resolution.y;

    // Calculate position relative to center
    vec2 shapeCenter = vec2(centerX, centerY);
    vec2 delta = uv - shapeCenter;

    // Rotate delta by animated angle FIRST
    float cosA = cos(animatedAngle);
    float sinA = sin(animatedAngle);
    vec2 rotatedDelta = vec2(
        delta.x * cosA - delta.y * sinA,
        delta.x * sinA + delta.y * cosA
    );

    // Apply aspect correction AFTER rotation
    rotatedDelta.x *= aspect;

    // Calculate distance based on shape type
    float dist;
    if (shapeType < 0.5) {
        dist = sdEllipse(rotatedDelta, vec2(shapeWidth, shapeHeight));
    } else {
        vec2 scaledDelta = rotatedDelta / vec2(shapeWidth, shapeHeight);
        dist = sdPolygon(scaledDelta, shapeSize / min(shapeWidth, shapeHeight), shapeType);
        dist *= min(shapeWidth, shapeHeight);
    }

    // Normalize distance for gradient
    float normalizedDist;
    if (shapeType < 0.5) {
        normalizedDist = dist / max(shapeWidth, shapeHeight) + 1.0;
    } else {
        normalizedDist = (dist / shapeSize) + 1.0;
    }
    normalizedDist = clamp(normalizedDist, 0.0, 1.0);

    // Create soft shape mask
    float shapeMask = 1.0 - smoothstep(-edgeSoftness * 0.1, edgeSoftness * 0.05, dist);

    // Create gradient
    float gradient = mix(1.0, grayLevel, smoothstep(0.0, 1.0, normalizedDist));

    // Apply solid core mask
    shapeMask *= solidCoreMask;

    ShapeData result;
    result.shape = shapeMask;
    result.gradient = gradient;
    return result;
}

// Creates two staggered animated shapes that move left-to-right
// When one reaches the far edge, another appears from the left
ShapeData calculateAnimatedShape(
    vec2 uv,
    float time,            // Current animation time in seconds
    float solidCoreMask,
    vec2 resolution
) {
    // --- Configurable parameters ---
    const float shapeType = 3.0;            // 0 = ellipse, 3 = triangle, 4 = square, 5 = pentagon, etc.
    const float shapeWidth = 0.1;           // Width/horizontal scale (wide)
    const float shapeHeight = 0.8;          // Height/vertical scale (short)
    const float centerY = 0.4;              // Vertical center position
    float cycleDuration = uCenterAnimDuration; // Seconds per animation cycle (from uniform)
    const float animRange = 0.7;            // How far left/right it travels
    const float edgeSoftness = 0.5;         // Softness of shape edge
    const float grayLevel = 0.5;            // Gray color at shape edge
    const float shapeAngleStart = 0.6;     // Rotation angle at start (slight tilt)
    const float shapeAngleEnd = 0.1;      // Rotation angle at end (opposite tilt)
    const float shapeSize = 0.4;            // Overall size for polygon mode
    const float staggerOffset = 0.4;        // Offset between the two shapes (0.5 = half cycle apart)
    const float shape2Scale = 1.3;          // Scale multiplier for 2nd shape (1.0 = same size)
    // -------------------------------

    // Time-based animation: time / cycleDuration gives progress through cycle
    float linearT1 = fract(time / cycleDuration);              // Shape 1: 0->1 repeating
    float linearT2 = fract(time / cycleDuration + staggerOffset);  // Shape 2: offset by staggerOffset

    // Calculate both shapes (shape 2 is slightly larger)
    ShapeData shape1 = calculateSingleShape(
        uv, linearT1, solidCoreMask, resolution,
        shapeType, shapeWidth, shapeHeight, centerY, animRange,
        edgeSoftness, grayLevel, shapeAngleStart, shapeAngleEnd, shapeSize
    );

    ShapeData shape2 = calculateSingleShape(
        uv, linearT2, solidCoreMask, resolution,
        shapeType, shapeWidth * shape2Scale, shapeHeight * shape2Scale, centerY, animRange,
        edgeSoftness, grayLevel, shapeAngleStart, shapeAngleEnd, shapeSize * shape2Scale
    );

    // Combine both shapes (take max of masks, blend gradients)
    ShapeData result;
    result.shape = max(shape1.shape, shape2.shape);
    // Weighted average of gradients based on shape masks
    float totalMask = shape1.shape + shape2.shape;
    if (totalMask > 0.001) {
        result.gradient = (shape1.gradient * shape1.shape + shape2.gradient * shape2.shape) / totalMask;
    } else {
        result.gradient = 0.5;
    }

    return result;
}

// Apply shape effect to intensity (for colorama/displacement pipeline)
float applyShapeToIntensity(
    float baseIntensity,
    ShapeData shapeData,
    float effectStrength
) {
    // Blend the shape gradient into the base intensity
    // This makes the shape area brighter/differently colored through colorama
    float shapeContribution = shapeData.gradient * shapeData.shape;
    return mix(baseIntensity, shapeContribution, shapeData.shape * effectStrength);
}


// AE-style color processing (levels, gamma, contrast). Used in both ripple and normal mode.
vec3 applyColorCorrection(vec3 color) {
    color = (color - uCCBlackPoint) / (uCCWhitePoint - uCCBlackPoint);
    color = pow(max(color, vec3(0.0)), vec3(1.0 / (uCCMidtoneGamma * uCCGamma)));
    color = color * (1.0 + uCCContrast) - uCCContrast * 0.5;
    return clamp(color, 0.0, 1.0);
}

// Feather at container edges (visible bounds). Used in both ripple and normal mode.
vec3 applyEdgeFeathering(vec3 color, vec3 bgColor) {
    // Apply edge feathering when zoomed in
    // Feathering is applied at the container edges (visible bounds), not canvas edges
    // uEdgeFeather = vec4(top, right, bottom, left) \u2014 clockwise like CSS
    if (any(greaterThan(uEdgeFeather, vec4(0.0)))) {
        vec2 screenUV = vUv;

        // Get visible UV bounds (where container clips the canvas)
        float visMinX = uVisibleUvBounds.x;
        float visMinY = uVisibleUvBounds.y;
        float visMaxX = uVisibleUvBounds.z;
        float visMaxY = uVisibleUvBounds.w;

        // Calculate visible dimensions in UV space for aspect-correct feathering on X axis
        float visibleWidth = visMaxX - visMinX;
        float visibleHeight = visMaxY - visMinY;
        float visibleAspect = visibleWidth / visibleHeight;

        // Per-side feather amounts (X sides get aspect correction for pixel-equal width)
        float featherTop    = uEdgeFeather.x * 0.15 / visibleAspect;
        float featherRight  = uEdgeFeather.y * 0.15 / visibleAspect;
        float featherBottom = uEdgeFeather.z * 0.15 / visibleAspect;
        float featherLeft   = uEdgeFeather.w * 0.15 / visibleAspect;

        // Apply feathering at container edges (visible bounds)
        float left   = smoothstep(visMinX, visMinX + featherLeft,   screenUV.x);
        float right  = smoothstep(visMaxX, visMaxX - featherRight,  screenUV.x);
        float bottom = smoothstep(visMinY, visMinY + featherBottom,  screenUV.y);
        float top    = smoothstep(visMaxY, visMaxY - featherTop,     screenUV.y);

        float edgeMask = left * right * bottom * top;
        // Blend towards background color instead of white to avoid visible edges
        color = mix(bgColor, color, edgeMask);
    }
    return color;
}

void main() {
    // ============================================
    // LAYER 1: Base glass effect (fine slits, whole image)
    // ============================================
    float numSegments = uNumSegments;
    float angle = uSlitAngle;
    const float blurRadius = 9.0;
    const float sigma = 4.0;

    // Calculate aspect ratio for consistent slit angles
    float aspect = iResolution.x / iResolution.y;

    // Displacement parameters (in pixels, scaled by DPR)
    // Scale displacement by reference resolution ratio to maintain consistency across browser zoom levels
    float resolutionScale = iResolution.x / uRefResolution.x;
    vec2 maxDisplacement = vec2(uDisplacementX, uDisplacementY) * uDpr * resolutionScale;

    // Use pre-computed UV from vertex shader (zoom + pan already applied)
    vec2 uv = vContentUv;

    // Base displacement (fine slits)
    // Use raw screen UV (vUv) so slit positions stay fixed on screen regardless of pan/zoom
    float gradientStart = 1.0;
    float gradientEnd = 0.0;
    float gradientPower = 1.0;
    float centerPoint = 0.5;
    vec2 displacementData = createStripedDisplacement(
        vUv,
        numSegments,
        angle,
        gradientStart,
        gradientEnd,
        gradientPower,
        centerPoint,
        aspect
    );
    float signedDisplacement = displacementData.x;
    float localUVx = displacementData.y;

    // ============================================
    // LAYER 2: Inner glass effect (larger slits, center only, STATIC)
    // ============================================
    // Inner segments are a divisor of outer segments for perfect alignment
    // 45 / 5 = 9 segments (5x larger slits that align with outer grid)
    float innerNumSegments = numSegments;
    float innerAngle = angle;            // Same angle as outer

    // Inner slits are STATIC - use raw screen UV so slits stay fixed on screen
    vec2 innerDisplacementData = createStripedDisplacement(
        vUv,
        innerNumSegments,
        innerAngle,
        gradientStart,
        gradientEnd,
        gradientPower,
        centerPoint,
        aspect
    );
    float innerSignedDisplacement = innerDisplacementData.x;
    float innerLocalUVx = innerDisplacementData.y;

    // ============================================
    // COMPUTE SOLID CORE MASK EARLY (needed for light & displacement masking)
    // ============================================
    vec4 videoFrameSample = texture2D(uVideoTexture, uv);
    float maskIntensity = luminance(videoFrameSample.rgb);
    float solidCoreMask = smoothstep(0.4, 0.7, maskIntensity);

    // Store original displacement for shape refraction (before masking)
    float originalInnerDisplacement = innerSignedDisplacement;

    // Mask inner displacement by solidCoreMask - no inner displacement in center
    innerSignedDisplacement *= (1.0 - solidCoreMask);

    // Inner layer displacement uses same values (scaled by resolutionScale for zoom independence)
    vec2 innerMaxDisplacement = vec2(30.0, 0.0) * uDpr * resolutionScale;

    // ============================================
    // CENTER ELEMENT (Static Ellipse + Animated Shapes)
    // ============================================
    float staticEllipseMask = 0.0;
    float staticEllipseGradient = 0.0;
    ShapeData shapeData;
    shapeData.shape = 0.0;
    shapeData.gradient = 0.0;

    float centerFadeInDuration = 10.0;
    float centerFramesSinceStart = uFrameCount - uLightStartFrame;
    float centerEffectActivation = clamp(centerFramesSinceStart / centerFadeInDuration, 0.0, 1.0);

    if (uEnableCenterElement > 0.5) {
        // Calculate static ellipse mask
        {
            const float ellipseCenterX = 0.3;
            const float ellipseCenterY = -0.15;
            const float ellipseWidth = 0.5;
            const float ellipseHeight = 0.8;
            const float ellipseAngle = 0.3;
            const float ellipseSoftness = 1.0;
            const float ellipseGrayLevel = 0.5;

            float aspect = iResolution.x / iResolution.y;

            // Use RAW UV (no displacement) for the mask calculation
            vec2 delta = uv - vec2(ellipseCenterX, ellipseCenterY);

            // Rotate
            float cosA = cos(ellipseAngle);
            float sinA = sin(ellipseAngle);
            vec2 rotatedDelta = vec2(
                delta.x * cosA - delta.y * sinA,
                delta.x * sinA + delta.y * cosA
            );
            rotatedDelta.x *= aspect;

            // Calculate ellipse distance
            float ellipseDist = sdEllipse(rotatedDelta, vec2(ellipseWidth, ellipseHeight));

            // Soft shape mask
            staticEllipseMask = 1.0 - smoothstep(-ellipseSoftness * 0.1, ellipseSoftness * 0.05, ellipseDist);

            // Gradient
            float normalizedDist = ellipseDist / max(ellipseWidth, ellipseHeight) + 1.0;
            normalizedDist = clamp(normalizedDist, 0.0, 1.0);
            staticEllipseGradient = mix(1.0, ellipseGrayLevel, smoothstep(0.0, 1.0, normalizedDist));

            // Apply solid core mask
            staticEllipseMask *= solidCoreMask;
        }

        // Block displacement inside the static ellipse
        originalInnerDisplacement *= (1.0 - staticEllipseMask);
        innerSignedDisplacement *= (1.0 - staticEllipseMask);
        signedDisplacement *= (1.0 - staticEllipseMask);


        // Calculate displaced UV for shape - use inner displacement for the shape refraction
        vec2 shapeDisplacedUV = applyDisplacement(uv, originalInnerDisplacement, innerMaxDisplacement, iResolution);

        // Calculate animated shape using DISPLACED UVs so glass slits refract through it
        shapeData = calculateAnimatedShape(
            shapeDisplacedUV,  // Use displaced UVs!
            uCenterAnimTime,   // Time-based animation in seconds (resets with video loop)
            solidCoreMask,
            iResolution
        );

        // Combine static ellipse with animated shapes
        {
            float combinedShape = max(shapeData.shape, staticEllipseMask) * centerEffectActivation;
            float totalMask = shapeData.shape + staticEllipseMask;
            float combinedGradient = shapeData.gradient;
            if (totalMask > 0.001) {
                combinedGradient = (shapeData.gradient * shapeData.shape + staticEllipseGradient * staticEllipseMask) / totalMask;
            }
            shapeData.shape = combinedShape;
            shapeData.gradient = combinedGradient;
        }
    }

    // ============================================
    // INNER EFFECT ACTIVATION - starts after uLightStartFrame
    // ============================================
    float innerFadeInDuration = 10.0;  // Slower fade-in for inner effect
    float innerFramesSinceStart = uFrameCount - uLightStartFrame;
    float innerEffectActivation = clamp(innerFramesSinceStart / innerFadeInDuration, 0.0, 1.0);

    // Create edge mask (solidCoreMask already computed earlier for light masking)
    float edgeMask = smoothstep(0.3, 0.6, maskIntensity);      // Where shape starts

    // Blend outer and inner slits on the edges
    // Inner contribution is multiplied by activation (fades in after frame 200)
    float outerContribution = 1.0 - edgeMask * 0.5 * innerEffectActivation;
    float innerContribution = edgeMask * innerEffectActivation;

    // Combined displacement: inner effect fades in over time
    float combinedDisplacement = signedDisplacement * outerContribution +
                                  innerSignedDisplacement * innerContribution;

    // Blend max displacement smoothly
    vec2 combinedMaxDisplacement = maxDisplacement * outerContribution +
                                    innerMaxDisplacement * innerContribution;

    // For the CENTER area (solidCoreMask): use 100% inner (larger) slits displacement
    // For the EDGES: use the combined displacement (blended outer + inner)
    // This ensures the logo center always has the larger slits
    combinedDisplacement = mix(combinedDisplacement, originalInnerDisplacement, solidCoreMask);
    combinedMaxDisplacement = mix(combinedMaxDisplacement, innerMaxDisplacement, solidCoreMask);

    // ============================================
    // LAYER 1: DISPLACEMENT (toggleable)
    // ============================================
    vec4 textureSample;
    if (uEnableDisplacement > 0.5) {
        textureSample = sampleWithDisplacement(
            uVideoTexture, uv,
            combinedDisplacement, combinedMaxDisplacement,
            iResolution
        );
    } else {
        // No displacement - sample directly
        textureSample = texture2D(uVideoTexture, uv);
    }

    // Blend localUVx for highlights - also fades in with activation
    float combinedLocalUVx = localUVx * outerContribution + innerLocalUVx * innerContribution;
    localUVx = combinedLocalUVx;

    // Store innerMask for later use (bloom, etc.) - also tied to activation
    float innerMask = edgeMask * innerEffectActivation;

    // Get Phase From: Intensity (Rec. 709 luminance)
    float baseIntensity = luminance(textureSample.rgb);

    // Boost intensity in center areas to push them more towards white
    float centerWhiteBoost = 0.1;
    baseIntensity = baseIntensity + innerMask * centerWhiteBoost;
    baseIntensity = clamp(baseIntensity, 0.0, 1.0);

    // Keep base intensity for outer colorama (using uGradientMap)
    float outerIntensity = baseIntensity;

    // ============================================
    // CENTER GREEN STRIPES OVERLAY (before colorama)
    // ============================================
    float stripeFadeOutDuration = 10.0;
    float stripeFramesSinceStart = uFrameCount - uLightStartFrame;
    // Effect is active UNTIL uLightStartFrame, then fades out
    float stripeEffectActivation = 1.0 - clamp(stripeFramesSinceStart / stripeFadeOutDuration, 0.0, 1.0);

    // Animated vertical height mask - grows from 0 to full height
    // Height animation: starts at center (0.5) and expands outward
    float stripeHeightDelay = 15.0;  // frames to wait before starting
    float stripeHeightGrowDuration = 80.0;  // frames to reach full height
    float stripeHeightProgress = clamp((uFrameCount - stripeHeightDelay) / stripeHeightGrowDuration, 0.0, 1.0);
    // Ease the progress for smoother animation
    float easedHeightProgress = 1.0 - pow(1.0 - stripeHeightProgress, 2.0);

    // Calculate animated bounds - expand from center (0.5) outward
    float heightHalfSpan = 0.2 * easedHeightProgress;  // 0.06 = half of the 0.12 total height (0.44 to 0.56)
    float softEdge = 0.1 * easedHeightProgress;        // Soft edge also scales with progress
    float bottomEdge = 0.5 - heightHalfSpan - softEdge;
    float bottomFull = 0.5 - heightHalfSpan;
    float topFull = 0.5 + heightHalfSpan;
    float topEdge = 0.5 + heightHalfSpan + softEdge;

    // When progress is 0, force mask to 0 to avoid glitchy edge at y=0.5
    float stripeHeightMask = easedHeightProgress > 0.001
        ? smoothstep(bottomEdge, bottomFull, uv.y) * smoothstep(topEdge, topFull, uv.y)
        : 0.0;

    vec4 centerGreenSlantedLines = createStripes(
      vUv + vec2(-0.0035, 0.0),                     // slight offset to avoid moir\xE9
      numSegments,
      uSlitAngle,
      0.15,                                       // stopPosition (20%)
      vec4(20.0/255.0, 200.0/255.0, 20.0/255.0, 0.2), // colorStart (green at 0%)
      vec4(0.0, 0.0, 0.0, 0.0),                       // colorMid (white at 20%)
      aspect                                          // aspect ratio for consistent angle
    ) * solidCoreMask * stripeHeightMask;

    // Overlay green stripes on center element area
    float stripeOverlayMask = solidCoreMask * stripeEffectActivation;
    // Modify baseIntensity/outerIntensity with stripes before colorama
    vec4 stripedTexture = vec4(textureSample.rgb, 1.0) - centerGreenSlantedLines*0.7 * stripeOverlayMask;
    stripedTexture = clamp(stripedTexture, 0.0, 1.0);

    // Update intensity for colorama input
    float stripedIntensity = luminance(stripedTexture.rgb);
    outerIntensity = mix(baseIntensity, stripedIntensity, stripeOverlayMask);

    // ============================================
    // LAYER 2: COLORAMA (toggleable)
    // ============================================
    vec3 color;
    if (uEnableColorama > 0.5) {
        // OUTER colorama: uses base intensity, cross-fades between uGradientMap and uGradientMap2
        vec3 outerColoramaResult1 = applyColoramaWithGradient(
            uGradientMap, outerIntensity,
            uInputMin, uInputMax, uModifyGamma, uPosterizeLevels,
            uCycleRepetitions, uPhaseShift, uCycleSpeed,
            uWrapMode, uReverse
        );
        vec3 outerColoramaResult2 = applyColoramaWithGradient(
            uGradientMap2, outerIntensity,
            uInputMin, uInputMax, uModifyGamma, uPosterizeLevels,
            uCycleRepetitions, uPhaseShift, uCycleSpeed,
            uWrapMode, uReverse
        );
        vec3 outerColoramaResult = mix(outerColoramaResult1, outerColoramaResult2, uGradientMapBlend);

        // Start with outer colorama as base
        vec3 blendedColorama = outerColoramaResult;

        // CENTER colorama: only compute when inside shape (skip texture sample otherwise)
        // This saves a texture lookup + specular pow() for ~90% of pixels
        if (shapeData.shape > 0.001) {
            vec3 centerColoramaResult = applyColoramaWithGradient(
                uCenterGradientMap, shapeData.gradient,
                uInputMin, uInputMax, uModifyGamma, uPosterizeLevels,
                uCycleRepetitions, uPhaseShift, uCycleSpeed,
                uWrapMode, uReverse
            );

            // Add specular highlight to center (shiny reflection effect)
            float specularPower = 8.0;      // Higher = tighter/smaller highlight
            float specularIntensity = 1.9;  // Brightness of the specular
            float specular = pow(shapeData.gradient, specularPower) * specularIntensity;
            centerColoramaResult += vec3(specular) * uSpecularTint;  // Add bright highlight

            // Blend between outer and center colorama based on shape
            blendedColorama = mix(outerColoramaResult, centerColoramaResult, shapeData.shape);
        }

        color = mix(blendedColorama, textureSample.rgb, uBlendWithOriginal);
    } else {
        color = textureSample.rgb;
    }

    // Store intensity for bloom (use the blended value)
    float intensity = mix(outerIntensity, shapeData.gradient, shapeData.shape);

    // ============================================
    // LAYER 3: BLOOM (toggleable)
    // ============================================
    if (uEnableBloom > 0.5) {
        color = applyBloom(color, intensity, innerMask);
    }

    // ============================================
    // LAYER 4: SHAPE HIGHLIGHT (toggleable via light sweep toggle)
    // ============================================
    if (uEnableLightSweep > 0.5) {
        float lightFadeInDuration = 30.0;
        float framesSinceStart = uFrameCount - uLightStartFrame;
        float lightActivation = clamp(framesSinceStart / lightFadeInDuration, 0.0, 1.0);

        // Add subtle brightness boost at shape center
        float shapeHighlight = pow(shapeData.gradient, 2.0) * shapeData.shape;
        color += vec3(1.0) * shapeHighlight * 0.15 * uLightIntensity * lightActivation;
    }

    // Color correction and edge feathering (shared with ripple mode)
    color = applyColorCorrection(color);
    // Blend with background color if provided (uBackgroundColor.r < 0 means not set)
    if (uBackgroundColor.r >= 0.0) {
        // Calculate luminance to determine how bright the pixel is
        float brightness = luminance(color);

        // Blend white/bright areas with background color
        // Bright areas (close to white) become the background color
        float blendStart = 0.94;  // Start blending at this brightness
        float blendEnd = 1.0;    // Fully background color at this brightness
        float blendAmount = smoothstep(blendStart, blendEnd, brightness);

        // Mix the shader color with background color
        color = mix(color, uBackgroundColor, blendAmount);
    }

    // Use background color for feathering if set, otherwise default to white
    vec3 featherColor = uBackgroundColor.r >= 0.0 ? uBackgroundColor : vec3(1.0);
    color = applyEdgeFeathering(color, featherColor);

    gl_FragColor = vec4(color, 1.0);
}
`
  );

  // ../../Desktop/2.0/DS2.0/Untitled/packages/klear360/src/components/Spark/KlearGlass/presets.ts
  var DEFAULT_CONFIG = {
    // Input Phase
    inputMin: 0,
    inputMax: 1,
    // Modify Phase
    modifyGamma: 1.05,
    posterizeLevels: 0,
    cycleRepetitions: 1,
    phaseShift: 0,
    cycleSpeed: 0,
    // Output Cycle
    wrapMode: false,
    reverse: true,
    // Composite
    blendWithOriginal: 0,
    gradientMapBlend: 0,
    gradientMapBlendDuration: 0.6,
    // Center Element
    enableCenterElement: true,
    centerAnimDuration: 6,
    // Color Correction
    ccBlackPoint: 0,
    ccWhitePoint: 0.9,
    ccMidtoneGamma: 1.2,
    ccGamma: 1.2,
    ccContrast: 0,
    // Displacement
    numSegments: 45,
    slitAngle: 0.15,
    displacementX: -12,
    displacementY: -20,
    // Playback
    paused: false,
    startTime: 0,
    endTime: 14,
    animateLightIndependently: false,
    playbackRate: 1,
    // Light Effect
    lightIntensity: 0.2,
    specularTint: [1, 1, 1],
    lightStartFrame: 140,
    // Effect Toggles
    enableDisplacement: true,
    enableColorama: true,
    enableBloom: true,
    enableLightSweep: true,
    // Canvas
    aspectRatio: 3 / 2,
    // Zoom & Pan
    zoom: 1,
    panX: 0,
    panY: 0,
    edgeFeather: [0, 0, 0, 0],
    // Background Color
    backgroundColor: [-1, -1, -1],
    // Cycle Animation
    animateCycleReps: true,
    cycleRepetitionsStart: 1,
    cycleRepetitionsEnd: 1.15,
    cycleRepetitionsStartFrame: 0,
    cycleRepetitionsDuration: 140
  };
  var getPresets = (assetsPath) => ({
    /** Baseline — identical to DEFAULT_CONFIG, no overrides */
    default: {},
    /**
     * Zoomed-in closeup: high zoom, fine segments, edge feathering.
     * Good for a tight card/badge usage.
     */
    zoomed: {
      lightIntensity: 0.2,
      lightStartFrame: 0,
      // Color Correction
      ccBlackPoint: 0,
      ccWhitePoint: 0.9,
      ccMidtoneGamma: 1.2,
      ccGamma: 1.62,
      ccContrast: 0,
      // Displacement
      numSegments: 20,
      slitAngle: 15 * Math.PI / 180,
      displacementX: -12,
      displacementY: -20,
      // Playback
      paused: true,
      startTime: 10,
      endTime: 14,
      animateLightIndependently: true,
      // Zoom & Pan
      zoom: 5,
      panX: -0.01,
      panY: 0.1,
      edgeFeather: [3, 5, 3, 3],
      // Animation
      animateCycleReps: true,
      cycleRepetitionsStart: 1,
      cycleRepetitionsEnd: 1.15,
      cycleRepetitionsStartFrame: 0,
      cycleRepetitionsDuration: 140
    },
    bottomWave: {
      imageSrc: `${assetsPath}/bottom-frame.jpg`,
      gradientMapSrc: `${assetsPath}/colorama-gradient-map-green.jpg`,
      gradientMap2Src: `${assetsPath}/colorama-gradient-map-blue.jpg`,
      gradientMapBlend: 0,
      modifyGamma: 0.97,
      edgeFeather: [0.3, 0, 3, 0],
      panY: 0.03,
      numSegments: 30,
      enableBloom: false,
      slitAngle: 15 * Math.PI / 180
    },
    rippleWave: {
      videoSrc: `${assetsPath}/ray-pulse.mp4`,
      aspectRatio: 1.61,
      playbackRate: 0.7,
      slitAngle: 15 * Math.PI / 180,
      numSegments: 35,
      ccGamma: 2,
      displacementX: -2,
      displacementY: -11,
      enableDisplacement: true,
      enableCenterElement: false,
      enableLightSweep: false,
      enableBloom: false,
      animateCycleReps: false,
      zoom: 2
    },
    circleSlideUp: {
      videoSrc: `${assetsPath}/success-animation-circle.mp4`,
      aspectRatio: 1.61,
      playbackRate: 0.85,
      slitAngle: 15 * Math.PI / 180,
      numSegments: 25,
      enableDisplacement: true,
      enableCenterElement: false,
      enableLightSweep: false,
      enableBloom: false,
      animateCycleReps: false,
      zoom: 1
    }
  });
  var getDarkOverlay = (assetsPath, config) => {
    const gammaProduct = (config.ccMidtoneGamma ?? DEFAULT_CONFIG.ccMidtoneGamma) * (config.ccGamma ?? DEFAULT_CONFIG.ccGamma);
    return {
      gradientMapSrc: `${assetsPath}/colorama-gradient-map-dark.png`,
      centerGradientMapSrc: `${assetsPath}/colorama-center-gradient-map-dark.jpg`,
      backgroundColor: [0, 0, 0],
      ccWhitePoint: Math.round(0.94 ** -gammaProduct * 1.02 * 1e3) / 1e3,
      enableBloom: false,
      lightIntensity: -0.35,
      specularTint: [0, 0, 0]
    };
  };

  // ../../Desktop/2.0/DS2.0/Untitled/packages/klear360/src/components/Spark/KlearGlass/utils.ts
  var DEFAULT_CDN_PATH = "https://cdn.jsdelivr.net/npm/@klear/klear360@latest/assets/spark";
  var getDefaultAssets = (assetsPath) => ({
    videoSrc: `${assetsPath}/spark-base-video.mp4`,
    imageSrc: `${assetsPath}/bottom-frame.jpg`,
    gradientMapSrc: `${assetsPath}/colorama-gradient-map-green.jpg`,
    gradientMap2Src: `${assetsPath}/colorama-gradient-map-blue.jpg`,
    centerGradientMapSrc: `${assetsPath}/colorama-center-gradient-map.jpg`
  });
  function extractConfig(props) {
    const {
      width: _width,
      height: _height,
      className: _className,
      style: _style,
      onLoad: _onLoad,
      onError: _onError,
      preset: _preset,
      assetsPath: _assetsPath,
      gradientMapSrc: _gradientMapSrc,
      gradientMap2Src: _gradientMap2Src,
      gradientMapCanvas: _gradientMapCanvas,
      imageSrc: _imageSrc,
      ...config
    } = props;
    return Object.fromEntries(
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      Object.entries(config).filter(([, v]) => v !== void 0)
    );
  }
  var ASSET_KEYS = /* @__PURE__ */ new Set([
    "videoSrc",
    "imageSrc",
    "gradientMapSrc",
    "gradientMap2Src",
    "centerGradientMapSrc"
  ]);
  function getPresetDefinition(preset, assetsPath, isDark = false) {
    const presets = getPresets(assetsPath);
    const definition = preset && preset in presets ? { ...presets[preset] } : {};
    if (!isDark) return definition;
    return { ...definition, ...getDarkOverlay(assetsPath, definition) };
  }
  function getPresetConfig(preset, assetsPath, isDark = false) {
    const def = getPresetDefinition(preset, assetsPath, isDark);
    return Object.fromEntries(
      Object.entries(def).filter(([k]) => !ASSET_KEYS.has(k))
    );
  }
  function getPresetAssets(preset, assetsPath, isDark = false) {
    const def = getPresetDefinition(preset, assetsPath, isDark);
    return Object.fromEntries(
      Object.entries(def).filter(([k]) => ASSET_KEYS.has(k))
    );
  }
  function resolveConfig(props, assetsPath, isDark = false) {
    return {
      ...getPresetConfig(props.preset, assetsPath, isDark),
      ...extractConfig(props)
    };
  }
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      img.src = src;
    });
  }
  function loadVideo(src) {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.src = src;
      video.crossOrigin = "anonymous";
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";
      video.oncanplaythrough = () => resolve(video);
      video.onerror = () => reject(new Error(`Failed to load video: ${src}`));
      video.load();
    });
  }
  function isSafari() {
    const ua = navigator.userAgent.toLowerCase();
    return ua.includes("safari") && !ua.includes("chrome") && !ua.includes("android");
  }
  function bestGuessBrowserZoom() {
    const viewportScale = visualViewport?.scale ?? 1;
    const viewportWidth = visualViewport?.width ?? window.innerWidth;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const innerWidth = viewportScale * viewportWidth + scrollbarWidth;
    const ratio = outerWidth / innerWidth;
    const zoomPercentageRounded = Math.round(100 * ratio);
    if (zoomPercentageRounded % 5 === 0) {
      return zoomPercentageRounded / 100;
    }
    if (zoomPercentageRounded === 33) return 1 / 3;
    if (zoomPercentageRounded === 67) return 2 / 3;
    if (zoomPercentageRounded === 133) return 4 / 3;
    return ratio;
  }
  async function preloadKlearSenseAssets(preset = "default", assetsPath = DEFAULT_CDN_PATH, colorScheme = "light") {
    const presetDef = getPresetDefinition(preset, assetsPath, colorScheme === "dark");
    const defaultAssets = getDefaultAssets(assetsPath);
    const videoSrc = presetDef.videoSrc ?? defaultAssets.videoSrc;
    const imageSrc = presetDef.imageSrc;
    const gradientMapSrc = presetDef.gradientMapSrc ?? defaultAssets.gradientMapSrc;
    const gradientMap2Src = presetDef.gradientMap2Src ?? defaultAssets.gradientMap2Src;
    const centerGradientMapSrc = presetDef.centerGradientMapSrc ?? defaultAssets.centerGradientMapSrc;
    const loadPromises = [];
    if (imageSrc) {
      loadPromises.push(loadImage(imageSrc));
    } else if (videoSrc) {
      loadPromises.push(loadVideo(videoSrc));
    }
    loadPromises.push(
      loadImage(gradientMapSrc),
      loadImage(gradientMap2Src),
      loadImage(centerGradientMapSrc)
    );
    await Promise.all(loadPromises);
  }

  // ../../Desktop/2.0/DS2.0/Untitled/packages/klear360/src/components/Spark/KlearGlass/webgl-utils.ts
  var FULLSCREEN_QUAD_POSITIONS = new Float32Array([
    -1,
    -1,
    // bottom-left
    1,
    -1,
    // bottom-right
    -1,
    1,
    // top-left
    -1,
    1,
    // top-left
    1,
    -1,
    // bottom-right
    1,
    1
    // top-right
  ]);
  var FULLSCREEN_QUAD_UVS = new Float32Array([
    0,
    0,
    // bottom-left
    1,
    0,
    // bottom-right
    0,
    1,
    // top-left
    0,
    1,
    // top-left
    1,
    0,
    // bottom-right
    1,
    1
    // top-right
  ]);
  function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("Shader compilation error:", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }
  function createProgram(gl, vertexSource, fragmentSource) {
    const format = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.MEDIUM_FLOAT);
    const precision = format ? format.precision : null;
    if (precision && precision < 23) {
      vertexSource = vertexSource.replace(
        /precision\s+(lowp|mediump)\s+float;/g,
        "precision highp float;"
      );
      fragmentSource = fragmentSource.replace(/precision\s+(lowp|mediump)\s+float/g, "precision highp float").replace(/\b(uniform|varying|attribute)\s+(lowp|mediump)\s+(\w+)/g, "$1 highp $3");
    }
    const vertexShader2 = createShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragmentShader2 = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    if (!vertexShader2 || !fragmentShader2) return null;
    const program = gl.createProgram();
    if (!program) return null;
    gl.attachShader(program, vertexShader2);
    gl.attachShader(program, fragmentShader2);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program linking error:", gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader2);
      gl.deleteShader(fragmentShader2);
      return null;
    }
    gl.detachShader(program, vertexShader2);
    gl.detachShader(program, fragmentShader2);
    gl.deleteShader(vertexShader2);
    gl.deleteShader(fragmentShader2);
    return program;
  }
  function setupFullscreenQuad(gl, program, positionAttr = "position", uvAttr = "uv") {
    const positionLocation = gl.getAttribLocation(program, positionAttr);
    const positionBuffer = gl.createBuffer();
    if (!positionBuffer) return null;
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, FULLSCREEN_QUAD_POSITIONS, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    const uvLocation = gl.getAttribLocation(program, uvAttr);
    const uvBuffer = gl.createBuffer();
    if (!uvBuffer) return null;
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, FULLSCREEN_QUAD_UVS, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(uvLocation);
    gl.vertexAttribPointer(uvLocation, 2, gl.FLOAT, false, 0, 0);
    return { positionBuffer, uvBuffer };
  }
  var Texture = class {
    constructor(gl, params = {}) {
      this.gl = gl;
      this.textureUnit = params.textureUnit ?? 0;
      this.minFilter = params.minFilter ?? gl.NEAREST;
      this.magFilter = params.magFilter ?? gl.NEAREST;
      this.wrapS = params.wrapS ?? gl.CLAMP_TO_EDGE;
      this.wrapT = params.wrapT ?? gl.CLAMP_TO_EDGE;
      this.flipY = params.flipY ?? true;
      this.texture = gl.createTexture();
      this.bind();
      this.setParameters();
    }
    bind() {
      const { gl } = this;
      gl.activeTexture(gl.TEXTURE0 + this.textureUnit);
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
    }
    setParameters() {
      const { gl } = this;
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, this.minFilter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, this.magFilter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, this.wrapS);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, this.wrapT);
    }
    /**
     * Upload image data to the texture (OGL-style)
     */
    image(source) {
      const { gl } = this;
      if (!source) return;
      this.bind();
      if (this.flipY) {
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      }
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    }
    /**
     * Update texture from video frame (call each frame for video textures)
     */
    update(source) {
      this.image(source);
    }
    destroy() {
      this.gl.deleteTexture(this.texture);
      this.texture = null;
    }
  };

  // ../../Desktop/2.0/DS2.0/Untitled/packages/klear360/src/components/Spark/KlearGlass/PerformanceManager.ts
  var POTATO_TIER_PATTERNS = [
    /swiftshader/,
    /llvmpipe/,
    /softpipe/,
    /microsoft basic render/,
    /virgl/
  ];
  var LOW_TIER_PATTERNS = [
    // Old Intel integrated
    /intel.*hd\s*(graphics)?\s*(2000|3000|4000|400|500|510|520|530)/,
    /intel.*gma/,
    // Old AMD integrated
    /amd.*radeon.*r[2-5]\s/,
    /amd.*radeon.*hd\s*(6|7)\d{3}/,
    // Very old NVIDIA
    /nvidia.*geforce\s*(4|5|6|7|8|9)\d{2}[^0]/,
    // Old mobile GPUs
    /mali-(4|t[0-9]|g5[0-7])\d*/,
    /adreno\s*(3|4)\d{2}/,
    /powervr.*sgx/,
    /vivante/,
    /gc\d{3}[^0-9]/
    // Vivante GC series
  ];
  var HIGH_TIER_PATTERNS = [
    // NVIDIA discrete
    /nvidia.*rtx/,
    /nvidia.*gtx\s*1[0-9]{3}/,
    /nvidia.*gtx\s*[2-9]\d{3}/,
    /nvidia.*quadro/,
    /nvidia.*titan/,
    // AMD discrete
    /amd.*rx\s*(5|6|7)\d{3}/,
    /amd.*radeon\s*(pro|rx)\s*(vega|5|6|7)/,
    /radeon\s*r9/,
    // Apple Silicon
    /apple\s*(m[1-9]|a1[5-9]|a[2-9]\d)/,
    // Modern mobile flagship
    /adreno\s*(7[3-9]\d|8\d{2})/,
    /mali-g(7[1-9]|[89]\d|[1-9]\d{2})/,
    /gpu\s*family\s*(apple\s*[5-9]|apple\s*[1-9]\d)/
  ];
  function isMobileDevice() {
    return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
  }
  function getDeviceMemoryGB() {
    const mem = navigator.deviceMemory;
    return mem != null ? mem : null;
  }
  function getCpuCores() {
    return navigator.hardwareConcurrency ?? 2;
  }
  function getGpuStrings(gl) {
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    if (!ext) return { renderer: null, vendor: null };
    const renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
    const vendor = gl.getParameter(ext.UNMASKED_VENDOR_WEBGL);
    return { renderer, vendor };
  }
  function checkMajorPerformanceCaveat() {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl", { failIfMajorPerformanceCaveat: true });
    return gl === null;
  }
  function classifyByRendererString(renderer, vendor) {
    if (!renderer && !vendor) return null;
    const combined = `${renderer ?? ""} ${vendor ?? ""}`.toLowerCase();
    for (const pattern of POTATO_TIER_PATTERNS) {
      if (pattern.test(combined)) return "potato";
    }
    for (const pattern of LOW_TIER_PATTERNS) {
      if (pattern.test(combined)) return "low";
    }
    for (const pattern of HIGH_TIER_PATTERNS) {
      if (pattern.test(combined)) return "high";
    }
    return null;
  }
  function classifyByDeviceSignals(memoryGB, cores, mobile) {
    if (memoryGB !== null && memoryGB <= 2) return "low";
    if (cores <= 2) return "low";
    if (memoryGB !== null && memoryGB >= 8 && cores >= 8 && !mobile) return "high";
    if (memoryGB !== null && memoryGB >= 6 && cores >= 6) return "high";
    return "mid";
  }
  var RENDER_SETTINGS = {
    high: {
      // ~4K equivalent
      maxPixelCount: 1920 * 1080 * 4,
      minPixelRatio: 2
    },
    mid: {
      // ~1080p equivalent
      maxPixelCount: 1920 * 1080 * 2,
      minPixelRatio: 1
    },
    low: {
      // ~720p max
      maxPixelCount: 1280 * 720,
      minPixelRatio: 1
    },
    potato: {
      // Software renderer – show static fallback immediately
      maxPixelCount: 0,
      minPixelRatio: 1
    },
    unknown: {
      // Treat conservatively – same as mid
      maxPixelCount: 1920 * 1080 * 2,
      minPixelRatio: 1
    }
  };
  var LEVEL_RENDER_SETTINGS = {
    3: RENDER_SETTINGS.high,
    2: RENDER_SETTINGS.mid,
    1: RENDER_SETTINGS.low,
    0: RENDER_SETTINGS.low
  };
  var PerformanceManager = class _PerformanceManager {
    /**
     * Detect GPU tier and return a full PerformanceProfile.
     *
     * @param gl - An existing WebGLRenderingContext (e.g. from KlearGlassMount).
     *             If not provided, a temporary offscreen context is created.
     */
    static detect(gl) {
      let ownedCanvas = false;
      let ctx = gl ?? null;
      if (!ctx) {
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        ctx = canvas.getContext("webgl") ?? null;
        ownedCanvas = true;
      }
      const mobile = isMobileDevice();
      const memoryGB = getDeviceMemoryGB();
      const cores = getCpuCores();
      const hasMajorPerformanceCaveat = checkMajorPerformanceCaveat();
      let gpuRenderer = null;
      let gpuVendor = null;
      if (ctx) {
        const { renderer, vendor } = getGpuStrings(ctx);
        gpuRenderer = renderer;
        gpuVendor = vendor;
        if (ownedCanvas) {
          ctx = null;
        }
      }
      let tier;
      if (hasMajorPerformanceCaveat) {
        tier = "potato";
      } else {
        tier = classifyByRendererString(gpuRenderer, gpuVendor) ?? classifyByDeviceSignals(memoryGB, cores, mobile);
      }
      if (tier === "high" && mobile) {
        tier = "mid";
      }
      return {
        tier,
        gpuRenderer,
        gpuVendor,
        deviceMemory: memoryGB,
        hardwareConcurrency: cores,
        isMobile: mobile,
        hasMajorPerformanceCaveat,
        renderSettings: RENDER_SETTINGS[tier]
      };
    }
    /**
     * Convenience: returns only the recommended RenderSettings without the
     * full diagnostic data.
     */
    static getRenderSettings(gl) {
      return _PerformanceManager.detect(gl).renderSettings;
    }
  };
  var TIER_INITIAL_STATE = {
    high: 3,
    mid: 2,
    low: 1,
    potato: 0,
    unknown: 2
  };
  var WebGLPerformanceController = class {
    constructor({ gl, onLevelChange = null }) {
      this.cooldown = 3e3;
      this.lastChange = 0;
      this.frameCount = 0;
      this.lastTime = performance.now();
      this.fps = 60;
      this.rafId = null;
      this.disposed = false;
      this.handleVisibilityChange = () => {
        if (document.hidden) {
          if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
          }
        } else {
          this.frameCount = 0;
          this.lastTime = performance.now();
          this.fps = 60;
          this.startMonitoring();
        }
      };
      this.onLevelChange = onLevelChange;
      const { tier } = PerformanceManager.detect(gl);
      this.level = TIER_INITIAL_STATE[tier];
      if (this.level === 0) {
        this.forceStaticFallback();
        return;
      }
      onLevelChange?.(this.level);
      this.startMonitoring();
      document.addEventListener("visibilitychange", this.handleVisibilityChange);
    }
    setLevel(level) {
      if (this.level === level) return;
      const now = performance.now();
      if (now - this.lastChange < this.cooldown) return;
      this.level = level;
      this.lastChange = now;
      if (level === 0) {
        this.forceStaticFallback();
        return;
      }
      this.onLevelChange?.(level);
    }
    forceStaticFallback() {
      this.level = 0;
      this.onLevelChange?.(0);
    }
    evaluatePerformance() {
      if (this.fps < 20) {
        this.setLevel(0);
      } else if (this.fps < 40) {
        this.setLevel(1);
      } else if (this.fps < 55) {
        this.setLevel(2);
      } else {
        this.setLevel(3);
      }
    }
    startMonitoring() {
      const loop = () => {
        if (this.disposed) return;
        const now = performance.now();
        this.frameCount++;
        if (now - this.lastTime >= 1e3) {
          this.fps = this.frameCount;
          this.frameCount = 0;
          this.lastTime = now;
          this.evaluatePerformance();
        }
        this.rafId = requestAnimationFrame(loop);
      };
      this.rafId = requestAnimationFrame(loop);
    }
    isPotato() {
      return this.level === 0;
    }
    /** Current performance level (3 = full, 0 = fallback) */
    getLevel() {
      return this.level;
    }
    /** Stop the monitoring loop and release resources */
    dispose() {
      this.disposed = true;
      if (this.rafId !== null) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
      document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    }
  };

  // ../../Desktop/2.0/DS2.0/Untitled/packages/klear360/src/components/Spark/KlearGlass/KlearGlassMount.ts
  var REF_RESOLUTION = { width: 3e3, height: 2e3 };
  var DEFAULT_MAX_PIXEL_COUNT = 1920 * 1080 * 4;
  var defaultStyle = `@layer klear-glass {
  :where([data-klear-glass]) {
    isolation: isolate;
    position: relative;
    overflow: hidden;

    & canvas {
      contain: strict;
      display: block;
      position: absolute;
      z-index: -1;
      border-radius: inherit;
      pointer-events: none;
    }
  }
}`;
  var CONFIG_TO_UNIFORM = {
    enableDisplacement: "uEnableDisplacement",
    enableColorama: "uEnableColorama",
    enableBloom: "uEnableBloom",
    enableLightSweep: "uEnableLightSweep",
    inputMin: "uInputMin",
    inputMax: "uInputMax",
    modifyGamma: "uModifyGamma",
    posterizeLevels: "uPosterizeLevels",
    cycleRepetitions: "uCycleRepetitions",
    phaseShift: "uPhaseShift",
    cycleSpeed: "uCycleSpeed",
    wrapMode: "uWrapMode",
    reverse: "uReverse",
    blendWithOriginal: "uBlendWithOriginal",
    lightIntensity: "uLightIntensity",
    lightStartFrame: "uLightStartFrame",
    numSegments: "uNumSegments",
    slitAngle: "uSlitAngle",
    displacementX: "uDisplacementX",
    displacementY: "uDisplacementY",
    enableCenterElement: "uEnableCenterElement",
    centerAnimDuration: "uCenterAnimDuration",
    ccBlackPoint: "uCCBlackPoint",
    ccWhitePoint: "uCCWhitePoint",
    ccMidtoneGamma: "uCCMidtoneGamma",
    ccGamma: "uCCGamma",
    ccContrast: "uCCContrast",
    zoom: "uZoom",
    // panX and panY are combined into uPan (vec2) in setUniformValues
    // backgroundColor is handled separately (needs clear color update)
    edgeFeather: "uEdgeFeather"
  };
  var KlearGlassMount = class {
    constructor(parentElement, assets, config = {}, frame = 0, minPixelRatio = 1, maxPixelCount = DEFAULT_MAX_PIXEL_COUNT) {
      this.program = null;
      this.uniformLocations = {};
      this.uniformCache = {};
      // Textures
      this.videoTexture = null;
      this.gradientMapTexture = null;
      this.gradientMap2Texture = null;
      this.centerGradientMapTexture = null;
      // Gradient map blend animation state
      this.currentGradientMapBlend = 0;
      // Video element
      this.video = null;
      this.videoFrameCallbackId = null;
      // Animation state (paper-shader style)
      this.rafId = null;
      /** Last render time in seconds */
      this.lastRenderTime = 0;
      /** Frame count (increments every frame) */
      this.currentFrame = 0;
      // Video-specific animation state
      /** Time for independent light animation (accumulates deltaTime) */
      this.independentLightTime = 0;
      /** Last video animation time (for detecting jumps) */
      this.lastVideoTime = 0;
      // State flags
      this.hasBeenDisposed = false;
      this.isInitialized = false;
      this.resolutionChanged = true;
      // Visible UV bounds (where container clips the canvas)
      // vec4(minX, minY, maxX, maxY) - portion of canvas UV that's visible
      this.visibleUvBounds = [0, 0, 1, 1];
      // Resize handling
      this.resizeObserver = null;
      this.renderScale = 1;
      this.parentWidth = 0;
      this.parentHeight = 0;
      this.parentDevicePixelWidth = 0;
      this.parentDevicePixelHeight = 0;
      this.devicePixelsSupported = false;
      this.isSafariBrowser = isSafari();
      // Performance monitoring
      this.performanceController = null;
      this.handleVisualViewportChange = () => {
        this.resizeObserver?.disconnect();
        this.setupResizeObserver();
      };
      this.handleResize = () => {
        const containerWidth = this.parentWidth || this.parentElement.clientWidth;
        const containerHeight = this.parentHeight || this.parentElement.clientHeight;
        const containerAspect = containerWidth / containerHeight;
        let canvasWidth;
        let canvasHeight;
        const targetAspectRatio = this.config.aspectRatio;
        if (containerAspect > targetAspectRatio) {
          canvasWidth = containerWidth;
          canvasHeight = containerWidth / targetAspectRatio;
        } else {
          canvasHeight = containerHeight;
          canvasWidth = containerHeight * targetAspectRatio;
        }
        const offsetX = (containerWidth - canvasWidth) / 2;
        const offsetY = (containerHeight - canvasHeight) / 2;
        const visibleMinX = -offsetX / canvasWidth;
        const visibleMaxX = (containerWidth - offsetX) / canvasWidth;
        const visibleMinY = -offsetY / canvasHeight;
        const visibleMaxY = (containerHeight - offsetY) / canvasHeight;
        this.visibleUvBounds = [visibleMinX, visibleMinY, visibleMaxX, visibleMaxY];
        this.canvasElement.style.width = `${canvasWidth}px`;
        this.canvasElement.style.height = `${canvasHeight}px`;
        this.canvasElement.style.left = `${offsetX}px`;
        this.canvasElement.style.top = `${offsetY}px`;
        let targetPixelWidth = 0;
        let targetPixelHeight = 0;
        const dpr = Math.max(1, window.devicePixelRatio);
        const pinchZoom = visualViewport?.scale ?? 1;
        if (this.devicePixelsSupported) {
          const canvasToParentRatioX = canvasWidth / containerWidth;
          const canvasToParentRatioY = canvasHeight / containerHeight;
          const scaleToMeetMinPixelRatio = Math.max(1, this.minPixelRatio / dpr);
          targetPixelWidth = this.parentDevicePixelWidth * canvasToParentRatioX * scaleToMeetMinPixelRatio * pinchZoom;
          targetPixelHeight = this.parentDevicePixelHeight * canvasToParentRatioY * scaleToMeetMinPixelRatio * pinchZoom;
        } else {
          let targetRenderScale = Math.max(dpr, this.minPixelRatio) * pinchZoom;
          if (this.isSafariBrowser) {
            const zoomLevel = bestGuessBrowserZoom();
            targetRenderScale *= Math.max(1, zoomLevel);
          }
          targetPixelWidth = Math.round(canvasWidth) * targetRenderScale;
          targetPixelHeight = Math.round(canvasHeight) * targetRenderScale;
        }
        const maxPixelCountHeadroom = Math.sqrt(this.maxPixelCount) / Math.sqrt(targetPixelWidth * targetPixelHeight);
        const scaleToMeetMaxPixelCount = Math.min(1, maxPixelCountHeadroom);
        const newWidth = Math.round(targetPixelWidth * scaleToMeetMaxPixelCount);
        const newHeight = Math.round(targetPixelHeight * scaleToMeetMaxPixelCount);
        const newRenderScale = newWidth / Math.round(canvasWidth);
        if (this.canvasElement.width !== newWidth || this.canvasElement.height !== newHeight || this.renderScale !== newRenderScale) {
          this.renderScale = newRenderScale;
          this.canvasElement.width = newWidth;
          this.canvasElement.height = newHeight;
          this.resolutionChanged = true;
          this.gl.viewport(0, 0, newWidth, newHeight);
          if (this.rafId === null) {
            this.render(performance.now());
          }
        }
      };
      this.handleDocumentVisibilityChange = () => {
        if (document.hidden) {
          this.stopRenderLoop();
          this.video?.pause();
        } else {
          this.startRenderLoop();
          if (!this.config.paused) {
            this.video?.play().catch(() => {
            });
          }
        }
      };
      this.render = (currentTime) => {
        if (this.hasBeenDisposed) return;
        this.rafId = requestAnimationFrame(this.render);
        if (this.program === null) {
          console.warn("Tried to render before program was initialized");
          return;
        }
        const gl = this.gl;
        const video = this.video;
        const currentTimeSeconds = currentTime * 1e-3;
        const deltaTime = currentTimeSeconds - this.lastRenderTime;
        this.lastRenderTime = currentTimeSeconds;
        this.currentFrame++;
        const usingStaticImage = !video && this.videoTexture !== null;
        if (!usingStaticImage) {
          if (!video || video.readyState < video.HAVE_CURRENT_DATA) {
            return;
          }
          if (!("requestVideoFrameCallback" in video) && this.videoTexture) {
            this.videoTexture.update(video);
          }
          if (!this.config.paused) {
            if (video.currentTime < this.config.startTime || video.currentTime >= this.config.endTime) {
              video.currentTime = this.config.startTime;
            }
          }
        }
        gl.clear(gl.COLOR_BUFFER_BIT);
        const videoAnimTime = usingStaticImage ? currentTimeSeconds : video.currentTime - this.config.startTime;
        if (this.config.animateLightIndependently || usingStaticImage) {
          this.independentLightTime += deltaTime;
        } else {
          const videoTimeDelta = videoAnimTime - this.lastVideoTime;
          const isVideoJump = Math.abs(videoTimeDelta) > 0.1 || videoTimeDelta < -0.01;
          if (isVideoJump) {
            this.independentLightTime = videoAnimTime;
          } else {
            this.independentLightTime += deltaTime;
          }
        }
        this.lastVideoTime = videoAnimTime;
        gl.useProgram(this.program);
        gl.uniform1f(this.uniformLocations.uTime, currentTimeSeconds);
        const frameCount = this.config.animateLightIndependently ? this.independentLightTime * 30 : videoAnimTime * 30;
        gl.uniform1f(this.uniformLocations.uFrameCount, frameCount);
        gl.uniform1f(this.uniformLocations.uCenterAnimTime, this.independentLightTime);
        if (this.resolutionChanged) {
          gl.uniform2f(
            this.uniformLocations.iResolution,
            this.canvasElement.width,
            this.canvasElement.height
          );
          gl.uniform1f(this.uniformLocations.uDpr, this.renderScale);
          gl.uniform4f(
            this.uniformLocations.uVisibleUvBounds,
            this.visibleUvBounds[0],
            this.visibleUvBounds[1],
            this.visibleUvBounds[2],
            this.visibleUvBounds[3]
          );
          this.resolutionChanged = false;
        }
        if (this.config.animateCycleReps && this.currentFrame > this.config.cycleRepetitionsStartFrame) {
          const elapsed = this.currentFrame - this.config.cycleRepetitionsStartFrame;
          const cycleProgress = elapsed % (this.config.cycleRepetitionsDuration * 2) / this.config.cycleRepetitionsDuration;
          const pingPong = cycleProgress <= 1 ? cycleProgress : 2 - cycleProgress;
          const eased = pingPong * pingPong * (3 - 2 * pingPong);
          const delta = this.config.cycleRepetitionsEnd - this.config.cycleRepetitionsStart;
          gl.uniform1f(
            this.uniformLocations.uCycleRepetitions,
            this.config.cycleRepetitionsStart + eased * delta
          );
        } else {
          gl.uniform1f(this.uniformLocations.uCycleRepetitions, this.config.cycleRepetitions);
        }
        const targetBlend = this.config.gradientMapBlend;
        if (this.currentGradientMapBlend !== targetBlend) {
          const speed = 1 / this.config.gradientMapBlendDuration;
          const diff = targetBlend - this.currentGradientMapBlend;
          const step = Math.sign(diff) * Math.min(Math.abs(diff), speed * deltaTime);
          this.currentGradientMapBlend += step;
          gl.uniform1f(this.uniformLocations.uGradientMapBlend, this.currentGradientMapBlend);
        }
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      };
      this.handlePerformanceLevelChange = (level) => {
        if (level === 0) {
          this.stopRenderLoop();
          this.canvasElement.style.display = "none";
          return;
        }
        const { maxPixelCount, minPixelRatio } = LEVEL_RENDER_SETTINGS[level];
        this.maxPixelCount = maxPixelCount;
        this.minPixelRatio = minPixelRatio;
        if (this.canvasElement.style.display === "none") {
          this.canvasElement.style.display = "";
        }
        if (this.isInitialized) {
          this.startRenderLoop();
        }
        this.handleResize();
      };
      this.parentElement = parentElement;
      this.assets = assets;
      this.config = { ...DEFAULT_CONFIG, ...config };
      this.currentFrame = frame;
      this.minPixelRatio = minPixelRatio;
      this.maxPixelCount = maxPixelCount;
      if (!document.querySelector("style[data-klear-glass-style]")) {
        const styleElement = document.createElement("style");
        styleElement.innerHTML = defaultStyle;
        styleElement.setAttribute("data-klear-glass-style", "");
        document.head.prepend(styleElement);
      }
      this.canvasElement = document.createElement("canvas");
      this.parentElement.prepend(this.canvasElement);
      this.parentElement.setAttribute("data-klear-glass", "");
      const gl = this.canvasElement.getContext("webgl", {
        antialias: false,
        premultipliedAlpha: false,
        depth: false,
        alpha: true,
        powerPreference: "high-performance"
      });
      this.gl = gl;
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.CULL_FACE);
      gl.clearColor(0, 0, 0, 0);
      this.initProgram();
      this.performanceController = new WebGLPerformanceController({
        gl: this.gl,
        onLevelChange: this.handlePerformanceLevelChange
      });
      this.stopIfPotato();
      this.setupPositionAttribute();
      this.setupUniformLocations();
      this.setupResizeObserver();
      visualViewport?.addEventListener("resize", this.handleVisualViewportChange);
      document.addEventListener("visibilitychange", this.handleDocumentVisibilityChange);
    }
    stopIfPotato() {
      if (!this.performanceController?.isPotato()) {
        return;
      }
      this.stopRenderLoop();
      throw new Error("KlearGlass: WebGL is not supported in this browser");
    }
    /**
     * Load all assets (video or static image + gradient maps) and start rendering.
     * When `assets.imageSrc` is provided it is used as a static base texture and
     * no video element is created.
     */
    async loadAssets() {
      this.stopIfPotato();
      try {
        const useStaticImage = Boolean(this.assets.imageSrc);
        const gradientMap2Src = this.assets.gradientMap2Src ?? this.assets.gradientMapSrc;
        const [baseAsset, gradientMap, gradientMap2, centerGradientMap] = await Promise.all([
          useStaticImage ? loadImage(this.assets.imageSrc) : loadVideo(this.assets.videoSrc),
          loadImage(this.assets.gradientMapSrc),
          loadImage(gradientMap2Src),
          loadImage(this.assets.centerGradientMapSrc)
        ]);
        if (useStaticImage) {
          this.setupImageTexture("uVideoTexture", baseAsset, 0);
        } else {
          this.video = baseAsset;
          this.setupVideoTexture();
          this.video.currentTime = this.config.startTime;
          this.video.playbackRate = this.config.playbackRate;
          if (!this.config.paused) {
            await this.video.play().catch((e) => {
              console.warn("Video autoplay failed:", e);
            });
          }
        }
        this.setupImageTexture("uGradientMap", gradientMap, 1);
        this.setupImageTexture("uCenterGradientMap", centerGradientMap, 2);
        this.setupImageTexture("uGradientMap2", gradientMap2, 3);
        this.setAllUniforms();
        this.isInitialized = true;
        this.handleResize();
        this.startRenderLoop();
      } catch (error) {
        console.error("KlearGlass: Failed to load assets", error);
        throw error;
      }
    }
    initProgram() {
      const program = createProgram(this.gl, klearGlassVertexShader, klearGlassFragmentShader);
      if (!program) {
        throw new Error("KlearGlass: Failed to create WebGL program");
      }
      this.program = program;
    }
    setupPositionAttribute() {
      const buffers = setupFullscreenQuad(this.gl, this.program);
      if (!buffers) {
        throw new Error("KlearGlass: Failed to setup fullscreen quad");
      }
    }
    setupUniformLocations() {
      const gl = this.gl;
      const program = this.program;
      const uniformNames = [
        "uTime",
        "iResolution",
        "uDpr",
        "uVideoTexture",
        "uGradientMap",
        "uGradientMap2",
        "uGradientMapBlend",
        "uCenterGradientMap",
        "uEnableDisplacement",
        "uEnableColorama",
        "uEnableBloom",
        "uEnableLightSweep",
        "uInputMin",
        "uInputMax",
        "uModifyGamma",
        "uPosterizeLevels",
        "uCycleRepetitions",
        "uPhaseShift",
        "uCycleSpeed",
        "uWrapMode",
        "uReverse",
        "uBlendWithOriginal",
        "uLightIntensity",
        "uSpecularTint",
        "uFrameCount",
        "uLightStartFrame",
        "uNumSegments",
        "uSlitAngle",
        "uDisplacementX",
        "uDisplacementY",
        "uEnableCenterElement",
        "uCenterAnimDuration",
        "uCenterAnimTime",
        "uCCBlackPoint",
        "uCCWhitePoint",
        "uCCMidtoneGamma",
        "uCCGamma",
        "uCCContrast",
        "uZoom",
        "uPan",
        // vec2(panX, panY) - set in vertex shader
        "uEdgeFeather",
        "uRefResolution",
        "uVisibleUvBounds",
        // vec4(minX, minY, maxX, maxY) - visible portion of canvas in UV space
        "uBackgroundColor",
        // vec3(r, g, b) - background color to blend with
        // Ripple wave
        "uEnableRippleWave",
        "uRippleSpeed",
        "uRippleBlend",
        "uRippleAngularPower",
        "uRippleRadialFalloff",
        "uRippleWaitTime"
      ];
      for (const name of uniformNames) {
        this.uniformLocations[name] = gl.getUniformLocation(program, name);
      }
    }
    setupVideoTexture() {
      this.videoTexture = new Texture(this.gl, { textureUnit: 0 });
      if (this.video && "requestVideoFrameCallback" in this.video) {
        const updateVideoFrame = () => {
          if (this.hasBeenDisposed || !this.video || !this.videoTexture) return;
          this.videoTexture.update(this.video);
          this.videoFrameCallbackId = this.video.requestVideoFrameCallback(updateVideoFrame);
        };
        this.videoFrameCallbackId = this.video.requestVideoFrameCallback(updateVideoFrame);
      }
    }
    setupImageTexture(uniformName, image, textureUnit) {
      const texture = new Texture(this.gl, { textureUnit });
      texture.image(image);
      if (uniformName === "uVideoTexture") {
        this.videoTexture = texture;
      } else if (uniformName === "uGradientMap") {
        this.gradientMapTexture = texture;
      } else if (uniformName === "uGradientMap2") {
        this.gradientMap2Texture = texture;
      } else if (uniformName === "uCenterGradientMap") {
        this.centerGradientMapTexture = texture;
      }
    }
    /**
     * Hot-swap the gradient map texture at runtime.
     * Accepts an HTMLCanvasElement (generated by generateGradientCanvas) or an HTMLImageElement.
     * No reinitialization required — the next frame will pick up the new texture.
     */
    updateGradientMapTexture(source) {
      if (!this.isInitialized || !this.gradientMapTexture) return;
      this.gradientMapTexture.image(source);
    }
    setupResizeObserver() {
      this.resizeObserver = new ResizeObserver(([entry]) => {
        if (entry?.borderBoxSize[0]) {
          const physicalPixelSize = entry.devicePixelContentBoxSize?.[0];
          if (physicalPixelSize !== void 0) {
            this.devicePixelsSupported = true;
            this.parentDevicePixelWidth = physicalPixelSize.inlineSize;
            this.parentDevicePixelHeight = physicalPixelSize.blockSize;
          }
          this.parentWidth = entry.borderBoxSize[0].inlineSize;
          this.parentHeight = entry.borderBoxSize[0].blockSize;
        }
        this.handleResize();
      });
      this.resizeObserver.observe(this.parentElement);
    }
    setAllUniforms() {
      const gl = this.gl;
      gl.useProgram(this.program);
      gl.uniform1i(this.uniformLocations.uVideoTexture, 0);
      gl.uniform1i(this.uniformLocations.uGradientMap, 1);
      gl.uniform1i(this.uniformLocations.uCenterGradientMap, 2);
      gl.uniform1i(this.uniformLocations.uGradientMap2, 3);
      gl.uniform1f(this.uniformLocations.uGradientMapBlend, this.currentGradientMapBlend);
      this.setUniformValues(this.config);
      if (this.config.specularTint === void 0) {
        gl.uniform3f(this.uniformLocations.uSpecularTint, 1, 1, 1);
      }
      gl.uniform2f(this.uniformLocations.uPan, this.config.panX, this.config.panY);
      gl.uniform2f(this.uniformLocations.uRefResolution, REF_RESOLUTION.width, REF_RESOLUTION.height);
      if (this.config.backgroundColor) {
        const [r, g, b] = this.config.backgroundColor;
        gl.uniform3f(this.uniformLocations.uBackgroundColor, r, g, b);
        gl.clearColor(r, g, b, 1);
      } else {
        gl.uniform3f(this.uniformLocations.uBackgroundColor, -1, -1, -1);
        gl.clearColor(0, 0, 0, 0);
      }
      gl.uniform4f(
        this.uniformLocations.uVisibleUvBounds,
        this.visibleUvBounds[0],
        this.visibleUvBounds[1],
        this.visibleUvBounds[2],
        this.visibleUvBounds[3]
      );
    }
    /** Check if uniform values are equal (handles arrays) */
    areUniformValuesEqual(a, b) {
      if (a === b) return true;
      if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) {
        return a.every((val, i) => this.areUniformValuesEqual(val, b[i]));
      }
      return false;
    }
    /** Set uniform values with caching to avoid redundant updates */
    setUniformValues(config) {
      const gl = this.gl;
      gl.useProgram(this.program);
      Object.entries(config).forEach(([key, value]) => {
        if (value === void 0) return;
        if (this.areUniformValuesEqual(this.uniformCache[key], value)) return;
        this.uniformCache[key] = value;
        const uniformName = CONFIG_TO_UNIFORM[key];
        if (!uniformName) return;
        const location = this.uniformLocations[uniformName];
        if (!location) return;
        if (typeof value === "boolean") {
          gl.uniform1f(location, value ? 1 : 0);
        } else if (typeof value === "number") {
          gl.uniform1f(location, value);
        } else if (Array.isArray(value)) {
          const flatArray = value.flat();
          switch (flatArray.length) {
            case 2:
              gl.uniform2fv(location, flatArray);
              break;
            case 3:
              gl.uniform3fv(location, flatArray);
              break;
            case 4:
              gl.uniform4fv(location, flatArray);
              break;
          }
        }
      });
      if (config.panX !== void 0 || config.panY !== void 0) {
        const panCacheKey = "pan";
        const panValue = [this.config.panX, this.config.panY];
        if (!this.areUniformValuesEqual(this.uniformCache[panCacheKey], panValue)) {
          this.uniformCache[panCacheKey] = panValue;
          gl.uniform2f(this.uniformLocations.uPan, panValue[0], panValue[1]);
        }
      }
      if (config.specularTint !== void 0) {
        const tintCacheKey = "specularTint";
        if (!this.areUniformValuesEqual(this.uniformCache[tintCacheKey], config.specularTint)) {
          this.uniformCache[tintCacheKey] = config.specularTint;
          const [r, g, b] = config.specularTint;
          gl.uniform3f(this.uniformLocations.uSpecularTint, r, g, b);
        }
      }
      if (config.backgroundColor !== void 0) {
        const bgCacheKey = "backgroundColor";
        if (!this.areUniformValuesEqual(this.uniformCache[bgCacheKey], config.backgroundColor)) {
          this.uniformCache[bgCacheKey] = config.backgroundColor;
          if (config.backgroundColor) {
            const [r, g, b] = config.backgroundColor;
            gl.uniform3f(this.uniformLocations.uBackgroundColor, r, g, b);
            gl.clearColor(r, g, b, 1);
          } else {
            gl.uniform3f(this.uniformLocations.uBackgroundColor, -1, -1, -1);
            gl.clearColor(0, 0, 0, 0);
          }
        }
      }
    }
    /**
     * Update uniforms from config (partial update supported)
     */
    setUniforms(newConfig) {
      this.config = { ...this.config, ...newConfig };
      if (!this.isInitialized) return;
      this.setUniformValues(newConfig);
      if (newConfig.paused !== void 0) {
        if (newConfig.paused) {
          this.video?.pause();
        } else {
          this.video?.play().catch(() => {
          });
        }
      }
      if (newConfig.playbackRate !== void 0 && this.video) {
        this.video.playbackRate = newConfig.playbackRate;
      }
      if (newConfig.aspectRatio !== void 0) {
        this.handleResize();
      }
    }
    startRenderLoop() {
      if (this.rafId !== null) return;
      this.lastRenderTime = performance.now() * 1e-3;
      this.rafId = requestAnimationFrame(this.render);
    }
    stopRenderLoop() {
      if (this.rafId !== null) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
    }
    // ===== Public API (paper-shader style) =====
    /** Get the current animation frame (in ms) */
    getCurrentFrame() {
      return this.currentFrame;
    }
    /** Set a specific frame for deterministic results */
    setFrame(newFrame) {
      this.currentFrame = newFrame;
    }
    /** Set the maximum pixel count for performance tuning */
    setMaxPixelCount(newMaxPixelCount = DEFAULT_MAX_PIXEL_COUNT) {
      this.maxPixelCount = newMaxPixelCount;
      this.handleResize();
    }
    /** Set the minimum pixel ratio for quality tuning */
    setMinPixelRatio(newMinPixelRatio = 2) {
      this.minPixelRatio = newMinPixelRatio;
      this.handleResize();
    }
    /** Play video */
    play() {
      this.config.paused = false;
      this.video?.play().catch(() => {
      });
    }
    /** Pause video */
    pause() {
      this.config.paused = true;
      this.video?.pause();
    }
    /** Seek to specific time in video */
    setTime(time) {
      if (this.video) {
        this.video.currentTime = time;
      }
    }
    /** Clean up all WebGL resources */
    dispose() {
      this.hasBeenDisposed = true;
      if (this.rafId !== null) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
      if (this.videoFrameCallbackId !== null && this.video && "cancelVideoFrameCallback" in this.video) {
        this.video.cancelVideoFrameCallback(this.videoFrameCallbackId);
      }
      if (this.video) {
        this.video.pause();
        this.video.src = "";
        this.video.load();
        this.video = null;
      }
      if (this.gl && this.program) {
        this.videoTexture?.destroy();
        this.gradientMapTexture?.destroy();
        this.gradientMap2Texture?.destroy();
        this.centerGradientMapTexture?.destroy();
        this.gl.deleteProgram(this.program);
        this.program = null;
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, null);
        this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, null);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this.gl.getError();
      }
      this.performanceController?.dispose();
      this.performanceController = null;
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
        this.resizeObserver = null;
      }
      visualViewport?.removeEventListener("resize", this.handleVisualViewportChange);
      document.removeEventListener("visibilitychange", this.handleDocumentVisibilityChange);
      this.uniformLocations = {};
      this.uniformCache = {};
      this.canvasElement.remove();
      this.parentElement.removeAttribute("data-klear-glass");
    }
  };

  // ../../Desktop/2.0/DS2.0/Untitled/packages/klear360/src/components/Spark/KlearSenseGradient/shader.ts
  var FLUID_GRADIENT_LOOP = 12;
  var fragmentShader = (
    /* glsl */
    `
precision mediump float;

uniform float uTime;    // pre-wrapped: mod(raw, LOOP)
uniform vec2  iResolution;
uniform vec2  uOrigin;  // gradient origin in UV space (0,0)=top-left (1,1)=bottom-right
varying vec2 vUv;

// Cubic smoothstep inside each segment \u2014 no kink at stop boundaries
vec3 gradientColor(float t) {
  t = clamp(t, 0.0, 1.0);
  vec3 c0 = vec3(0.682, 0.957, 0.831);  // 174, 244, 212
  vec3 c1 = vec3(0.310, 0.882, 0.620);  //  79, 225, 158
  vec3 c2 = vec3(0.306, 0.973, 0.910);  //  78, 248, 232
  vec3 c3 = vec3(0.004, 0.753, 0.443);  //   1, 192, 113
  vec3 c4 = vec3(0.004, 0.753, 0.443);  //   1, 192, 113
  float s;
  if (t < 0.25) { s = smoothstep(0.0,1.0, t/0.25);         return mix(c0,c1,s); }
  if (t < 0.55) { s = smoothstep(0.0,1.0,(t-0.25)/0.30);   return mix(c1,c2,s); }
  if (t < 0.80) { s = smoothstep(0.0,1.0,(t-0.55)/0.25);   return mix(c2,c3,s); }
                  s = smoothstep(0.0,1.0,(t-0.80)/0.20);   return mix(c3,c4,s);
}

// Value noise
float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);
}

void main() {
  // Envelope controls: how the gradient fades from center outward
  const float FADE_OUTER_EDGE = 1.4;   // distance where gradient fully fades to black
  const float FADE_INNER_EDGE = 0.4;  // distance where gradient is at full opacity

  vec2 uv = vUv - uOrigin;
  float angle = atan(uv.y, uv.x);
  float r = length(uv);

  // Warp: traces a circle in noise space \u2192 exactly periodic in LOOP seconds.
  // speed = 2\u03C0 * n / LOOP  (n integer \u2192 1 full orbit per loop)
  float ws = 6.2832 / 12.0;   // 2\u03C0/LOOP \u2014 1 orbit in LOOP s
  float ws2 = ws * 2.0;       // 2 orbits in LOOP s
  float warp =
    vnoise(vec2(cos(angle)*1.4 + sin(uTime*ws )*2.0, sin(angle)*1.4 + cos(uTime*ws )*2.0)) * 0.50 +
    vnoise(vec2(cos(angle)*2.6 + sin(uTime*ws2)*1.2, sin(angle)*2.6 + cos(uTime*ws2)*1.2)) * 0.25;
  float organicR = r + (warp - 0.45) * 0.04;

  // Three wave sines \u2014 speeds are 2\u03C0*n/LOOP (n=3,2,1) \u2192 integer cycles in LOOP s.
  // Spatial frequencies are irrational ratios so they never phase-lock into
  // distinct bands; the result is one broad, shifting swell.
  float s1 = 6.2832 * 3.0 / 12.0;  // 3 cycles in LOOP s
  float s2 = 6.2832 * 2.0 / 12.0;  // 2 cycles
  float s3 = 6.2832 * 1.0 / 12.0;  // 1 cycle
  float w =
    sin(organicR * 4.80 - uTime * s1) * 0.55 +
    sin(organicR * 2.55 - uTime * s2) * 0.30 +
    sin(organicR * 1.45 - uTime * s3) * 0.15;

  float phase = w * 0.5 + 0.5;
  vec3 color = gradientColor(phase);

  float envelope = smoothstep(FADE_OUTER_EDGE, FADE_INNER_EDGE, r);
  color = color * envelope;

  // Film grain effect
  float grain = hash(vUv * 500.0 + fract(uTime * 0.5)) * 2.0 - 1.0;
  color += grain * 0.0002;

  gl_FragColor = vec4(color, 1.0);
}
`
  );

  // ../../Desktop/2.0/DS2.0/Untitled/packages/klear360/src/components/Spark/KlearSenseGradient/FluidGradientMount.ts
  var vertexShader = (
    /* glsl */
    `
  precision mediump float;
  attribute vec2 position;
  attribute vec2 uv;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 0, 1);
  }
`
  );
  var FluidGradientMount = class {
    constructor(parentElement, size, origin = [0.5, 0.5]) {
      this.gl = null;
      this.program = null;
      this.buffers = null;
      this.rafId = null;
      // Uniform locations
      this.uTimeLoc = null;
      this.uOriginLoc = null;
      this.hasBeenDisposed = false;
      this.render = (t) => {
        if (this.hasBeenDisposed || !this.gl) return;
        this.rafId = requestAnimationFrame(this.render);
        this.gl.uniform1f(this.uTimeLoc, t * 1e-3 % FLUID_GRADIENT_LOOP);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
      };
      this.parentElement = parentElement;
      const dpr = Math.min(window.devicePixelRatio, 2);
      const pixelSize = Math.round(size * dpr);
      this.canvasElement = document.createElement("canvas");
      this.canvasElement.width = pixelSize;
      this.canvasElement.height = pixelSize;
      this.canvasElement.style.display = "block";
      this.canvasElement.style.width = `${size}px`;
      this.canvasElement.style.height = `${size}px`;
      parentElement.appendChild(this.canvasElement);
      const gl = this.canvasElement.getContext("webgl", {
        antialias: false,
        powerPreference: "high-performance",
        alpha: true
      });
      if (!gl) {
        console.error("FluidGradientMount: WebGL not supported");
        return;
      }
      this.gl = gl;
      this.setup(gl, pixelSize, origin);
      this.rafId = requestAnimationFrame(this.render);
    }
    setup(gl, pixelSize, origin) {
      const program = createProgram(gl, vertexShader, fragmentShader);
      if (!program) return;
      this.program = program;
      const buffers = setupFullscreenQuad(gl, program);
      if (!buffers) {
        gl.deleteProgram(program);
        this.program = null;
        return;
      }
      this.buffers = buffers;
      gl.useProgram(program);
      gl.viewport(0, 0, pixelSize, pixelSize);
      gl.disable(gl.DEPTH_TEST);
      this.uTimeLoc = gl.getUniformLocation(program, "uTime");
      this.uOriginLoc = gl.getUniformLocation(program, "uOrigin");
      const iResolutionLoc = gl.getUniformLocation(program, "iResolution");
      gl.uniform2f(iResolutionLoc, pixelSize, pixelSize);
      gl.uniform2f(this.uOriginLoc, origin[0], origin[1]);
    }
    /** Update the gradient origin in UV space without re-initialising WebGL. */
    setOrigin(origin) {
      if (!this.gl || !this.uOriginLoc) return;
      this.gl.uniform2f(this.uOriginLoc, origin[0], origin[1]);
    }
    /** Tear down the render loop, release all WebGL resources, and remove the canvas. */
    dispose() {
      this.hasBeenDisposed = true;
      if (this.rafId !== null) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
      if (this.gl) {
        if (this.program) {
          this.gl.deleteProgram(this.program);
          this.program = null;
        }
        if (this.buffers) {
          this.gl.deleteBuffer(this.buffers.positionBuffer);
          this.gl.deleteBuffer(this.buffers.uvBuffer);
          this.buffers = null;
        }
        this.gl.getExtension("WEBGL_lose_context")?.loseContext();
      }
      if (this.parentElement.contains(this.canvasElement)) {
        this.parentElement.removeChild(this.canvasElement);
      }
    }
  };

  // klear-sense-src.js
  var FADE_IN_MS = 200;
  var CANVAS_SCALE = 1.4;
  var DEFAULT_ASSETS_PATH = "./assets/spark";
  var MASKS = {
    klear: {
      d: "M5 3H8V10.8L15 3H19L11 11.5L19.4 21H15.4L8 12.6V21H5V3Z",
      viewBox: "0 0 24 24",
      fillRule: "evenodd"
    },
    ray: {
      d: "M3 3H7.5H9.74999L12 12L14.25 3H16.5H21V7.5V9.75L12 12L21 14.25V16.5V21H16.5H14.25L12 12L9.74999 21H7.5H3V16.5V14.25L12 12L3 9.75V7.5V3Z",
      viewBox: "0 0 24 24"
    },
    check: {
      d: "M20.7071 5.29289C21.0976 5.68342 21.0976 6.31658 20.7071 6.70711L9.70711 17.7071C9.31658 18.0976 8.68342 18.0976 8.29289 17.7071L3.29289 12.7071C2.90237 12.3166 2.90237 11.6834 3.29289 11.2929C3.68342 10.9024 4.31658 10.9024 4.70711 11.2929L9 15.5858L19.2929 5.29289C19.6834 4.90237 20.3166 4.90237 20.7071 5.29289Z",
      viewBox: "0 0 24 24"
    }
  };
  function cssSize(value, fallback) {
    if (value == null) return fallback;
    return typeof value === "number" ? `${value}px` : String(value);
  }
  function parseViewBoxSize(viewBox, dim) {
    const parts = String(viewBox || "0 0 24 24").trim().split(/[\s,]+/);
    const val = dim === "w" ? parseFloat(parts[2]) : parseFloat(parts[3]);
    return val > 0 ? val : 24;
  }
  async function preload(preset = "default", assetsPath = DEFAULT_ASSETS_PATH, colorScheme = "light") {
    return preloadKlearSenseAssets(preset, assetsPath, colorScheme);
  }
  async function mountKlearSense(parent, props = {}) {
    if (!parent) {
      throw new Error("KlearSense: parent element is required");
    }
    const {
      width = "100%",
      height = "100%",
      className = "",
      style = {},
      onLoad,
      onError,
      assetsPath = DEFAULT_ASSETS_PATH,
      gradientMapCanvas,
      ...rest
    } = props;
    const host = document.createElement("div");
    host.className = ["kn-klear-sense", className].filter(Boolean).join(" ");
    host.setAttribute("aria-hidden", "true");
    Object.assign(host.style, {
      width: cssSize(width, "100%"),
      height: cssSize(height, "100%"),
      position: "relative",
      overflow: "hidden",
      backgroundColor: "transparent",
      opacity: "0",
      transition: `${FADE_IN_MS}ms opacity`,
      pointerEvents: "none",
      ...style
    });
    parent.appendChild(host);
    const isDark = document.documentElement.dataset.colorScheme === "dark";
    const defaultAssets = getDefaultAssets(assetsPath);
    const presetAssets = getPresetAssets(rest.preset, assetsPath, isDark);
    const imageSrc = rest.imageSrc ?? presetAssets.imageSrc;
    const videoSrc = imageSrc ? void 0 : presetAssets.videoSrc ?? defaultAssets.videoSrc;
    const gradientMapSrc = rest.gradientMapSrc ?? presetAssets.gradientMapSrc ?? defaultAssets.gradientMapSrc;
    const gradientMap2Src = rest.gradientMap2Src ?? presetAssets.gradientMap2Src ?? defaultAssets.gradientMap2Src;
    const centerGradientMapSrc = presetAssets.centerGradientMapSrc ?? defaultAssets.centerGradientMapSrc;
    const config = resolveConfig({ ...rest, assetsPath }, assetsPath, isDark);
    let disposed = false;
    let glass = null;
    const api = {
      el: host,
      pause() {
        glass?.pause();
      },
      play() {
        glass?.play();
      },
      setUniforms(next) {
        glass?.setUniforms(next);
      },
      dispose() {
        disposed = true;
        glass?.dispose();
        glass = null;
        host.remove();
      }
    };
    try {
      glass = new KlearGlassMount(
        host,
        {
          videoSrc,
          imageSrc,
          gradientMapSrc,
          gradientMap2Src,
          centerGradientMapSrc
        },
        config
      );
      await glass.loadAssets();
      if (disposed) {
        api.dispose();
        return api;
      }
      if (gradientMapCanvas) {
        glass.updateGradientMapTexture(gradientMapCanvas);
      }
      const userWantsPaused = config.paused ?? false;
      if (!userWantsPaused) {
        glass.pause();
      }
      host.style.opacity = "1";
      window.setTimeout(() => {
        if (disposed || !glass) return;
        if (!userWantsPaused) {
          glass.play();
        }
        onLoad?.();
      }, FADE_IN_MS);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
      api.dispose();
      throw err;
    }
    return api;
  }
  function mountKlearSenseGradient(parent, options = {}) {
    if (!parent) {
      throw new Error("KlearSenseGradient: parent element is required");
    }
    const mask = typeof options.mask === "string" ? MASKS[options.mask] : options.mask;
    const path = options.path || mask?.d;
    if (!path) {
      throw new Error('KlearSenseGradient: pass mask="klear"|"ray"|"check" or a path with fill="white"');
    }
    const size = options.size ?? 56;
    const viewBox = options.viewBox || mask?.viewBox || "0 0 24 24";
    const origin = options.origin || [0.5, 0.5];
    const fillRule = options.fillRule || mask?.fillRule;
    const canvasSize = Math.round(size * CANVAS_SCALE);
    const offset = (canvasSize - size) / 2;
    const uid = `kn-fg-${Math.random().toString(36).slice(2, 9)}`;
    const maskId = `fg-mask-${uid}`;
    const vbW = parseViewBoxSize(viewBox, "w");
    const vbH = parseViewBoxSize(viewBox, "h");
    const ruleAttr = fillRule ? ` fill-rule="${fillRule}" clip-rule="${fillRule}"` : "";
    const host = document.createElement("div");
    host.className = ["kn-klear-sense-gradient", options.className || ""].filter(Boolean).join(" ");
    host.setAttribute("aria-hidden", "true");
    Object.assign(host.style, {
      position: "relative",
      width: `${size}px`,
      height: `${size}px`,
      display: "inline-block",
      overflow: "hidden",
      pointerEvents: "none",
      ...options.style || {}
    });
    host.innerHTML = `<svg aria-hidden="true" focusable="false" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden">
      <defs>
        <mask id="${maskId}" maskUnits="userSpaceOnUse" x="0" y="0" width="${canvasSize}" height="${canvasSize}">
          <g transform="translate(${offset}, ${offset}) scale(${size / vbW}, ${size / vbH})">
            <path d="${path}" fill="white"${ruleAttr}></path>
          </g>
        </mask>
      </defs>
    </svg>
    <div data-fg-canvas style="position:absolute;top:-${offset}px;left:-${offset}px;-webkit-mask:url(#${maskId});mask:url(#${maskId})"></div>`;
    parent.appendChild(host);
    const canvasHost = host.querySelector("[data-fg-canvas]");
    const gradient = new FluidGradientMount(canvasHost, canvasSize, origin);
    return {
      el: host,
      setOrigin(next) {
        gradient.setOrigin(next);
      },
      dispose() {
        gradient.dispose();
        host.remove();
      }
    };
  }
  window.KNKlearSense = {
    preloadKlearSenseAssets: preload,
    mountKlearSense,
    mountKlearSenseGradient,
    MASKS,
    DEFAULT_ASSETS_PATH
  };
})();
