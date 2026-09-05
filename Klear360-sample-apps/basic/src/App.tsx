import React from 'react';
import { Klear360Provider, Button } from '@klearnow/klear360/components';
import { klear360Theme } from '@klearnow/klear360/tokens';
import '@klearnow/klear360/fonts.css';

function App(): React.ReactElement {
  return (
    <Klear360Provider themeTokens={klear360Theme} colorScheme="light">
      <Button onClick={() => console.log('hi')}>Hello</Button>
    </Klear360Provider>
  );
}

export default App;
