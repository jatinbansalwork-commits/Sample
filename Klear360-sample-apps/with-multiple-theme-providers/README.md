# Klear360 with `styled-components`

When using Klear360 along with multiple theme providers (for example with `klear360-old` or your own custom theming) you should namespace your own theme so it doesn't conflict with klear360's theme tokens.

Check [`App.tsx`](./src/App.tsx) for example.

## Background

When a `ThemeProvider` is nested inside another `ThemeProvider`, `styled-components` by default merges the passed theme objects (this is a shallow merge by default).

```tsx
/**
 * klear360Theme
 * {
 *  ...
 *  colors { // 👈 Klear360 components need this token
 *      ...
 *  }
 *  ...
 * }
 *
 */

const myCustomTheme = {
  // 👇 Oops, this will override the colors key above
  colors: {
    primary: 'hotpink',
  },
};

const App = () => {
  // ...
  return (
    <Klear360Provider themeTokens={klear360Theme}>
      {/* The theme provider below will merge and replace any top level keys from `klear360Theme` above */}
      <ThemeProvider theme={myCustomTheme}>
        <Button>Hello</Button>
      </ThemeProvider>
    </Klear360Provider>
  );
};
```

There are some open issues and references on `styled-components` repo. Eg:

- [Recommendation for libraries](https://github.com/styled-components/styled-components-experimentation/blob/master/component-libraries/shared-component-libraries.md)
- https://github.com/styled-components/styled-components/issues/244
- https://github.com/styled-components/styled-components/issues/2417

At the moment, best solution is to namespace your custom theme tokens so it doesn't conflict with Klear360's.

> This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).
