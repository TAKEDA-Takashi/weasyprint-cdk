#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { WeasyprintCdkStack } from "../lib/weasyprint-cdk-stack";

const app = new cdk.App();
new WeasyprintCdkStack(app, "WeasyprintCdkStack", {});
