import type { NextApiRequest, NextApiResponse } from 'next';

const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只允许POST请求' });
  }

  const { action } = req.body;

  if (action !== 'check_credits') {
    return res.status(400).json({ error: '无效的操作' });
  }

  try {
    console.log('开始检查Runway API状态...');

    if (!RUNWAY_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'RUNWAY_API_KEY 未配置',
        details: '请在环境变量中设置 RUNWAY_API_KEY'
      });
    }

    // 分析API密钥格式
    const apiKeyInfo = {
      format: RUNWAY_API_KEY.startsWith('key_') ? 'Legacy (key_)' : RUNWAY_API_KEY.startsWith('rw_') ? 'New (rw_)' : 'Unknown',
      length: RUNWAY_API_KEY.length,
      prefix: RUNWAY_API_KEY.substring(0, 10),
      endpoint: RUNWAY_API_KEY.startsWith('key_') ? 'api.dev.runwayml.com' : 'api.runwayml.com'
    };

    console.log('API密钥信息:', apiKeyInfo);

    // 根据密钥格式选择不同的检查方式
    let result: any = {
      success: false,
      apiKeyInfo
    };

    if (RUNWAY_API_KEY.startsWith('key_')) {
      // 旧版API - 尝试获取账户信息
      try {
        console.log('使用旧版API检查...');
        const response = await fetch('https://api.dev.runwayml.com/v1/account', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${RUNWAY_API_KEY}`,
            'X-Runway-Version': '2024-09-13',
            'Content-Type': 'application/json'
          }
        });

        console.log('账户API响应状态:', response.status);
        const responseText = await response.text();
        console.log('账户API响应内容:', responseText);

        if (response.ok) {
          const accountData = JSON.parse(responseText);
          result.success = true;
          result.account = accountData;
          
          // 如果有积分信息
          if (accountData.credits !== undefined) {
            result.credits = {
              remaining: accountData.credits,
              total: accountData.total_credits || '未知',
              used: accountData.used_credits || '未知'
            };
          }
        } else {
          result.error = `账户API调用失败 (${response.status})`;
          result.details = responseText;
          result.rawResponse = {
            status: response.status,
            statusText: response.statusText,
            body: responseText
          };
        }
      } catch (accountError) {
        console.error('账户API调用错误:', accountError);
        result.error = '账户API网络错误';
        result.details = accountError instanceof Error ? accountError.message : '未知错误';
      }

      // 如果账户API失败，尝试任务API
      if (!result.success) {
        try {
          console.log('尝试任务API检查...');
          const taskResponse = await fetch('https://api.dev.runwayml.com/v1/tasks', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${RUNWAY_API_KEY}`,
              'X-Runway-Version': '2024-09-13',
              'Content-Type': 'application/json'
            }
          });

          console.log('任务API响应状态:', taskResponse.status);
          const taskResponseText = await taskResponse.text();
          console.log('任务API响应内容:', taskResponseText);

          if (taskResponse.ok) {
            result.success = true;
            result.message = 'API密钥有效（通过任务API验证）';
            result.rawResponse = {
              status: taskResponse.status,
              body: taskResponseText
            };
          } else {
            result.error = `任务API调用失败 (${taskResponse.status})`;
            result.details = taskResponseText;
            result.rawResponse = {
              status: taskResponse.status,
              statusText: taskResponse.statusText,
              body: taskResponseText
            };
          }
        } catch (taskError) {
          console.error('任务API调用错误:', taskError);
          result.error = '任务API网络错误';
          result.details = taskError instanceof Error ? taskError.message : '未知错误';
        }
      }

    } else if (RUNWAY_API_KEY.startsWith('rw_')) {
      // 新版API
      try {
        console.log('使用新版API检查...');
        const response = await fetch('https://api.runwayml.com/v1/account', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${RUNWAY_API_KEY}`,
            'Content-Type': 'application/json'
          }
        });

        console.log('新版API响应状态:', response.status);
        const responseText = await response.text();
        console.log('新版API响应内容:', responseText);

        if (response.ok) {
          const accountData = JSON.parse(responseText);
          result.success = true;
          result.account = accountData;
          
          if (accountData.credits !== undefined) {
            result.credits = {
              remaining: accountData.credits,
              total: accountData.total_credits || '未知',
              used: accountData.used_credits || '未知'
            };
          }
        } else {
          result.error = `新版API调用失败 (${response.status})`;
          result.details = responseText;
          result.rawResponse = {
            status: response.status,
            statusText: response.statusText,
            body: responseText
          };
        }
      } catch (newApiError) {
        console.error('新版API调用错误:', newApiError);
        result.error = '新版API网络错误';
        result.details = newApiError instanceof Error ? newApiError.message : '未知错误';
      }
    } else {
      result.error = '未知的API密钥格式';
      result.details = 'API密钥应该以 "key_" 或 "rw_" 开头';
    }

    // 最后，尝试一个简单的图生视频请求来测试积分
    if (result.success && !result.credits) {
      try {
        console.log('尝试测试图生视频请求...');
        const testRequestBody = {
          promptImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', // 1x1 透明图片
          promptText: 'test',
          model: 'gen3a_turbo',
          ratio: '16:9',
          duration: 5
        };

        const testResponse = await fetch(`https://${apiKeyInfo.endpoint}/v1/image_to_video`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RUNWAY_API_KEY}`,
            'X-Runway-Version': '2024-09-13',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(testRequestBody)
        });

        const testResponseText = await testResponse.text();
        console.log('测试请求响应:', testResponse.status, testResponseText);

        if (testResponse.status === 400 && testResponseText.includes('not have enough credits')) {
          result.credits = {
            remaining: 0,
            total: '未知',
            used: '未知'
          };
          result.creditTest = {
            status: 'insufficient_credits',
            message: '通过测试请求确认：积分不足'
          };
        } else if (testResponse.ok) {
          result.creditTest = {
            status: 'sufficient_credits',
            message: '通过测试请求确认：积分充足'
          };
        } else {
          result.creditTest = {
            status: 'test_failed',
            message: `测试请求失败: ${testResponse.status}`,
            details: testResponseText
          };
        }
      } catch (testError) {
        console.error('测试请求错误:', testError);
        result.creditTest = {
          status: 'test_error',
          message: '测试请求网络错误',
          details: testError instanceof Error ? testError.message : '未知错误'
        };
      }
    }

    console.log('最终检查结果:', result);
    res.status(200).json(result);

  } catch (error) {
    console.error('整体检查过程出错:', error);
    res.status(500).json({
      success: false,
      error: '检查过程出错',
      details: error instanceof Error ? error.message : '未知错误'
    });
  }
} 