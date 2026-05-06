FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf

# On copie directement le résultat du build qui a été fait en amont
COPY dist/sardine-beta/browser /usr/share/nginx/html

EXPOSE 80