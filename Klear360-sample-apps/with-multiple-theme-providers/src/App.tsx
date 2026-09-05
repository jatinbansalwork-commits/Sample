import styled, { ThemeProvider } from 'styled-components';
import { Klear360Provider, Button } from '@klearnow/klear360/components';
import { klear360Theme } from '@klearnow/klear360/tokens';
import '@klearnow/klear360/fonts.css';

import './app.css';

const customTheme = {
  // it is crucial to namespace your theme inside a key such as below to ensure it doesn't override anything unexpected in klear360's theme object
  // styled-components theme provider, when nested, shallow merges any theme objects passed
  myTheme: {
    colors: {
      primary: 'hotpink',
    },
  },
};

const MyButton = styled.button(({ theme }) => ({
  // this uses customTheme, note how we namespaced this behind `myTheme` so it doesn't override klear360's `color` key
  background: theme.myTheme.colors.primary,
  // this uses klear360's theme
  color: theme.colors.brand.primary[800],
  margin: '0 8px',
  padding: '8px 16px',
}));

function App(): React.ReactElement {
  return (
    <Klear360Provider themeTokens={klear360Theme} colorScheme="light">
      <ThemeProvider theme={customTheme}>
        <Button onClick={() => console.log('hi')}>Hello</Button>
        <MyButton onClick={() => console.log('hi')}>World</MyButton>
      </ThemeProvider>
    </Klear360Provider>
  );
}

export default App;
