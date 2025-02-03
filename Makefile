APP_NAME=fs-splitwise

migrate-up:
	npx drizzle-kit push

# Local - Install dependencies
local-install:
	npm install

# Local - Run the application in development mode (watch for changes)
local-run:
	NODE_TLS_REJECT_UNAUTHORIZED='0' npm run dev