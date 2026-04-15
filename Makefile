WEB_DIR := sadhguru_chat_website_core

.PHONY: start-web
start-web:
	cd $(WEB_DIR) && npm install && npm run dev
