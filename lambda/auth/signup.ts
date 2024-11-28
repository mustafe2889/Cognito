import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { SignUpBody } from "../../shared/types";
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  SignUpCommandInput,
} from "@aws-sdk/client-cognito-identity-provider";
import Ajv from "ajv";
import schema from "../../shared/types.schema.json";

const ajv = new Ajv();
const validateSignUpRequest = ajv.compile(schema.definitions["SignUpBody"] || {});

const client = new CognitoIdentityProviderClient({
  region: process.env.REGION,
});

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    console.log("[EVENT]", JSON.stringify(event));
    const body = event.body ? JSON.parse(event.body) : undefined;

    // Validate request body
    if (!validateSignUpRequest(body)) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `Invalid request body`,
          errors: ajv.errorsText(validateSignUpRequest.errors),
        }),
      };
    }

    const signUpBody = body as SignUpBody;

    const params: SignUpCommandInput = {
      ClientId: process.env.CLIENT_ID!,
      Username: signUpBody.username,
      Password: signUpBody.password,
      UserAttributes: [{ Name: "email", Value: signUpBody.email }],
    };

    const command = new SignUpCommand(params);
    const response = await client.send(command);

    return {
      statusCode: 201,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "User signed up successfully",
        response: response,
      }),
    };
  } catch (err) {
    // Handle 'unknown' type for errors
    console.error("[ERROR]", err);

    const errorMessage =
      err instanceof Error ? err.message : "An unexpected error occurred";

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: errorMessage,
      }),
    };
  }
};
