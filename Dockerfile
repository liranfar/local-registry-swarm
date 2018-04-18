FROM node
COPY server.js /
EXPOSE 8080 8081
HEALTHCHECK --interval=5s --timeout=10s --retries=3 CMD curl -sS 127.0.0.1:8080 || exit 1
CMD [ "node", "/server.js" ]
