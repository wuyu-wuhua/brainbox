import React, { useState } from 'react';
import { Tabs, TabList, Tab } from '@chakra-ui/react';

const models = [
  'DeepSeek',
  'GPT',
  'Claude',
  'Gemini',
  'Llama',
  'Grok',
  'Qwen',
];

const ModelTabs = () => {
  const [tabIndex, setTabIndex] = useState(0);
  return (
    <Tabs index={tabIndex} onChange={setTabIndex} variant="soft-rounded" colorScheme="blue" mt={2}>
      <TabList>
        {models.map((model) => (
          <Tab key={model}>{model}</Tab>
        ))}
      </TabList>
    </Tabs>
  );
};

export default ModelTabs; 