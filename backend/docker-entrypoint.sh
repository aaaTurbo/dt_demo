#!/bin/sh
set -e

npm run migrate:up

exec npm run start