// App entry point
import React from 'react';
import { Klear360Provider } from '@klearnow/klear360/components';
import { klear360Theme } from '@klearnow/klear360/tokens';
import { HashRouter } from 'react-router-dom';
import { createGlobalStyle } from 'styled-components';
import TopNav from '../navigation/TopNav';

const GlobalStyles = createGlobalStyle`
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  font-family: ${(props) => props.theme.typography.fonts.family.text}
}

h1, h2, h3, h4, h5, h6 {
  font-family: ${(props) => props.theme.typography.fonts.family.heading};
}
`;

function AppWrapper(): React.JSX.Element {
  return (
    <Klear360Provider themeTokens={klear360Theme} colorScheme="light">
      <GlobalStyles />
      <HashRouter>
        <TopNav />
      </HashRouter>
    </Klear360Provider>
  );
}

export default AppWrapper;
