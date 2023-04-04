import * as lambdaPython from "@aws-cdk/aws-lambda-python-alpha";
import {
  aws_iam as iam,
  aws_lambda as lambda,
  aws_s3 as s3,
  aws_s3_deployment as s3deploy,
} from "aws-cdk-lib";

import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

import * as path from "path";

export class WeasyprintCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = new s3.Bucket(this, "S3Bucket");

    new s3deploy.BucketDeployment(this, "AssetsDeploy", {
      sources: [s3deploy.Source.asset("assets")],
      destinationBucket: bucket,
      destinationKeyPrefix: "data_files",
    });

    const weasyprintLayer = new lambdaPython.PythonLayerVersion(
      this,
      "WeasyprintLayer",
      {
        layerVersionName: "weasyprint-layer",
        entry: path.resolve(__dirname, "../cloud-print-utils"),
        compatibleRuntimes: [lambda.Runtime.PYTHON_3_8],
        bundling: {
          image: cdk.DockerImage.fromBuild("./docker/"),
          environment: {
            HOST_PATH: path.resolve(__dirname, "../cloud-print-utils"),
          },
          user: "root",
          command: [
            "bash",
            "-c",
            [
              "make build/weasyprint-layer-python3.8.zip",
              "cp build/weasyprint-layer-python3.8.zip /asset-output",
            ].join(" && "),
          ],
          volumes: [
            {
              hostPath: "/var/run/docker.sock",
              containerPath: "/var/run/docker.sock",
            },
          ],
        },
      }
    );

    new lambdaPython.PythonFunction(this, "WeasyprintLambda", {
      entry: path.resolve(__dirname, "../app/weasyprint-lambda"),
      runtime: lambda.Runtime.PYTHON_3_8,
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
      environment: {
        BUCKET_NAME: bucket.bucketName,
        FONTCONFIG_PATH: "/opt/fonts",
        GDK_PIXBUF_MODULE_FILE: "/opt/lib/loaders.cache",
        XDG_DATA_DIRS: "/opt/lib",
      },
      layers: [weasyprintLayer],
      role: new iam.Role(this, "LambdaRole-WeasyprintLambda", {
        roleName: "lambda-WeasyprintLambdaFunctions-role",
        assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            "service-role/AWSLambdaBasicExecutionRole"
          ),
        ],
        inlinePolicies: {
          AllowS3: new iam.PolicyDocument({
            statements: [
              new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ["s3:PutObject", "s3:GetObject", "s3:ListBucket"],
                resources: [bucket.bucketArn, `${bucket.bucketArn}/*`],
              }),
            ],
          }),
        },
      }),
    });
  }
}
