import 'dotenv/config';

import express, { Request } from 'express';
import { IncomingLinearWebhookPayload } from './types';
import fetch from 'node-fetch';

const app = express();

const port: number = parseInt(process.env.PORT ?? '3000');

app.use(express.json());

app.post<Request['params'], unknown, IncomingLinearWebhookPayload>('/linear/:webhookTarget', async (req, res) => {
  const payload = req.body;

  const webhookTarget = req.params.webhookTarget;

  if (payload.action === 'create' && payload.type === 'Issue') {
    const result = await newIssue(payload, webhookTarget);
    if (!result)
    {
      res.status(400).send({status: 400, message: "Unknown webhook target."})
      return;
    }
  }

  res.sendStatus(200);
});

app.listen(port, () => console.log(`Webhook consumer listening on port ${port}!`));

function newIssue(payload: IncomingLinearWebhookPayload, webhookTarget: string) {
  const target = process.env[`WEBHOOK_${webhookTarget.toUpperCase()}`];

  if (target === undefined) return false;

  return fetch(target, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      embeds: [
        {
          color: 0x4752b2,
          author: {
            name: `Issue Created [${getId(payload.url)}]`,
          },
          title: payload.data.title,
          url: payload.url,
          fields: [
            {
              name: 'Priority',
              value: getPriorityValue(payload.data.priority ?? 0),
              inline: true,
            },
            {
              name: 'Points',
              value: payload.data.estimate,
              inline: true,
            },
            {
              name: 'Labels',
              value: prettifyLabels(payload.data.labels!),
              inline: false,
            },
          ],
          timestamp: new Date(),
          footer: {
            text: `Linear App`,
            icon_url: 'https://pbs.twimg.com/profile_images/1121592030449168385/MF6whgy1_400x400.png',
          },
        },
      ],
    }),
  });
}

/**
 * Get the Priority Value translated
 * @param priority number for priority
 */
function getPriorityValue(priority: NonNullable<IncomingLinearWebhookPayload['data']['priority']>) {
  switch (priority) {
    case 0:
      return 'None';
    case 1:
      return 'Urgent';
    case 2:
      return 'High';
    case 3:
      return 'Medium';
    case 4:
      return 'Low';
  }
}

/**
 * Get the task ID from url
 * @param link task url
 */
function getId(link: string) {
  return link.split('/')[5];
}

/**
 * Formats and prettifies label(s)
 * @param labels connected labels
 */
function prettifyLabels(labels: NonNullable<IncomingLinearWebhookPayload['data']['labels']>) {
  return labels.map((label) => label.name).join(', ');
}
