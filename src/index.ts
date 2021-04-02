import 'dotenv/config';

import express, { Request } from 'express';
import { IncomingLinearWebhookPayload } from './types';
import fetch from 'node-fetch';

const app = express();

const port: number = parseInt(process.env.PORT ?? '3000');

const embedFooter = {
  text: `Linear App`,
  icon_url:
    "https://pbs.twimg.com/profile_images/1121592030449168385/MF6whgy1_400x400.png",
};

app.use(express.json());

app.post<Request['params'], unknown, IncomingLinearWebhookPayload>('/linear/:webhookTarget', async (req, res) => {
  const payload = req.body;
  const webhookTarget = req.params.webhookTarget;
  const target = process.env[`WEBHOOK_${webhookTarget.toUpperCase()}`];

  if (target === undefined) {
    console.log("Invalid target: Webhook env not set");
    return res.status(400).send({status: 400, message: "Unknown webhook target."});
  }

  console.log("Received webhook event for target", webhookTarget);
  
  if (payload.action === 'create') {
    if (payload.type === 'Issue')
      await newIssue(payload, target);
    else if (payload.type === 'Comment')
      await newComment(payload, target);
  }

  res.sendStatus(200);
});

app.listen(port, () => console.log(`Webhook consumer listening on port ${port}!`));

function newComment(payload: IncomingLinearWebhookPayload, webhookTarget: string) {
  console.log("Sending comment webhook to target", webhookTarget);
  return fetch(webhookTarget, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      embeds: [
        {
          color: 0x73ff73,
          author: {
            name: `Comment Created [${getCommentId(payload.url)}]`,
          },
          title: `Comment by ${payload.data.user!.name}`,
          url: payload.url,
          timestamp: new Date(),
          fields: [
            {
              name: "Content",
              value: payload.data.body,
            },
            {
              name: "Issue",
              value: payload.data.issue!.title
            }
          ],
          footer: embedFooter,
        },
      ],
    }),
  });
}

function newIssue(payload: IncomingLinearWebhookPayload, webhookTarget: string) {
  console.log("Sending issue webhook to target", webhookTarget);
  let fields = [
    {
      name: "Priority",
      value: getPriorityValue(payload.data.priority ?? 0),
      inline: true,
    }
  ];

  if (payload.data.labels)
    fields.push({
      name: "Labels",
      value: prettifyLabels(payload.data.labels),
      inline: false,
    });

  return fetch(webhookTarget, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      embeds: [
        {
          color: 0x4752b2,
          author: {
            name: `Issue Created [${getIssueId(payload.url)}]`,
          },
          title: payload.data.title,
          url: payload.url,
          fields: fields,
          timestamp: new Date(),
          footer: embedFooter,
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
function getIssueId(link: string) {
  return link.split('/')[5];
}

/**
 * Get the comment ID from url
 * @param link comment url
 */
function getCommentId(link: string) {
  return link.split('#')[1];
}

/**
 * Formats and prettifies label(s)
 * @param labels connected labels
 */
function prettifyLabels(labels: NonNullable<IncomingLinearWebhookPayload['data']['labels']>) {
  return labels.map((label) => label.name).join(', ');
}
