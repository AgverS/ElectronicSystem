FROM nginx:alpine

# Copy the configuration file into the image
# This is necessary for platforms like Railway where volume mounts aren't the primary way to provide config
COPY prod.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
