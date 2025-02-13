#!/bin/bash

export AWS_ACCESS_KEY_ID=000000000000 AWS_SECRET_ACCESS_KEY=000000000000

awslocal dynamodb create-table \
             --table-name game \
             --key-schema AttributeName=id,KeyType=HASH \
             --attribute-definitions AttributeName=id,AttributeType=S \
             --billing-mode PAY_PER_REQUEST \
             --region local
awslocal dynamodb create-table \
             --table-name game_user \
             --key-schema AttributeName=game_id,KeyType=HASH AttributeName=user_id,KeyType=RANGE \
             --attribute-definitions AttributeName=game_id,AttributeType=S AttributeName=user_id,AttributeType=S \
             --billing-mode PAY_PER_REQUEST \
             --region local
awslocal dynamodb create-table \
             --table-name game_state \
             --key-schema AttributeName=game_id,KeyType=HASH \
             --attribute-definitions AttributeName=game_id,AttributeType=S \
             --billing-mode PAY_PER_REQUEST \
             --region local
awslocal dynamodb create-table \
             --table-name sessions \
             --key-schema AttributeName=id,KeyType=HASH \
             --attribute-definitions AttributeName=id,AttributeType=S \
             --billing-mode PAY_PER_REQUEST \
             --region local