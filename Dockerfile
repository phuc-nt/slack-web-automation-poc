# One image for both processes: the Slack app (default command) and the mock portal.
# The base image carries Chromium and its system libraries; its tag must match the
# playwright version in package.json.
FROM mcr.microsoft.com/playwright:v1.63.0-noble

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY scripts ./scripts
RUN mkdir artifacts && chown pwuser artifacts

USER pwuser
ENV NODE_ENV=production
CMD ["node", "src/slack/start-slack-app.js"]
