import * as cdk from "aws-cdk-lib";
import { Aws } from "aws-cdk-lib";
import { Construct } from "constructs";
import { UserPool } from "aws-cdk-lib/aws-cognito";
import * as apig from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as node from "aws-cdk-lib/aws-lambda-nodejs";

export class AuthAppStack extends cdk.Stack {
  private auth: apig.IResource;
  private userPoolId: string;
  private userPoolClientId: string;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Cognito User Pool
    const userPool = new UserPool(this, "UserPool", {
      signInAliases: { username: true, email: true },
      selfSignUpEnabled: true,
      autoVerify: { email: true }, // Automatically verify email addresses
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Clean up resources on stack removal
    });

    this.userPoolId = userPool.userPoolId;

    // Cognito App Client
    const appClient = userPool.addClient("AppClient", {
      authFlows: { userPassword: true },
    });

    this.userPoolClientId = appClient.userPoolClientId;

    // API Gateway for Authentication
    const authApi = new apig.RestApi(this, "AuthServiceApi", {
      description: "Authentication Service RestApi",
      endpointTypes: [apig.EndpointType.REGIONAL],
      defaultCorsPreflightOptions: {
        allowOrigins: apig.Cors.ALL_ORIGINS,
        allowMethods: apig.Cors.ALL_METHODS,
      },
    });

    this.auth = authApi.root.addResource("auth");

    // Adding routes using reusable method
    this.addAuthRoute("signup", "POST", "SignupFunction", "signup.ts", true);
    this.addAuthRoute("signin", "POST", "SigninFunction", "signin.ts", true);
    this.addAuthRoute("signout", "POST", "SignoutFunction", "signout.ts", true);
    this.addAuthRoute(
      "confirmSignup",
      "POST",
      "ConfirmSignupFunction",
      "confirmSignup.ts",
      true
    );
  }

  /**
   * Reusable method to add authentication routes
   * @param resourceName - The API resource name
   * @param method - HTTP method for the resource
   * @param fnName - Name of the Lambda function
   * @param fnEntry - Entry point for the Lambda function
   * @param allowCognitoAccess - Flag to determine if Cognito access is required
   */
  private addAuthRoute(
    resourceName: string,
    method: string,
    fnName: string,
    fnEntry: string,
    allowCognitoAccess?: boolean
  ): void {
    const commonFnProps = {
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "handler",
      environment: {
        USER_POOL_ID: this.userPoolId,
        CLIENT_ID: this.userPoolClientId,
        REGION: Aws.REGION,
      },
    };

    const resource = this.auth.addResource(resourceName);

    const fn = new node.NodejsFunction(this, fnName, {
      ...commonFnProps,
      entry: `${__dirname}/../lambda/auth/${fnEntry}`,
    });

    resource.addMethod(method, new apig.LambdaIntegration(fn));
  }
}
