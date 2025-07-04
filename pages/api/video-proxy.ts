import type { NextApiRequest, NextApiResponse } from 'next';
import { pipeline } from 'stream';

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    res.status(400).send('Missing url');
    return;
  }

  // 支持 Range 请求
  const range = req.headers.range;

  const fetchOptions: any = {
    method: 'GET',
    headers: {},
  };
  if (range) {
    fetchOptions.headers['Range'] = range;
  }

  const response = await fetch(url, fetchOptions);

  // 复制所有响应头
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  // 允许跨域
  res.setHeader('Access-Control-Allow-Origin', '*');

  // 设置状态码
  res.status(response.status);

  // 流式转发（Node.js stream方式）
  if (response.body) {
    // @ts-ignore
    pipeline(response.body, res, (err) => {
      if (err) {
        res.end();
      }
    });
  } else {
    res.end();
  }
} 