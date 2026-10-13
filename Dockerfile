FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Panel API'ye kendi adresi üzerinden (nginx proxy) bağlanır; bu yüzden API adresi boş bırakılır.
ENV VITE_API_URL=""
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine
# nginx imajı açılışta /etc/nginx/templates/*.template dosyalarını envsubst ile /etc/nginx/conf.d/ altına yazar.
# Yalnız ortamda tanımlı değişkenler (API_UPSTREAM) değiştirilir; $host, $uri gibi nginx değişkenleri korunur.
ENV API_UPSTREAM="http://magickiosk-api.magickiosk.svc.cluster.local"
COPY templates/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
