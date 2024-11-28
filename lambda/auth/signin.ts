import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { SignInBody } from "../../shared/types";
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import Ajv from "ajv";
import schema from "../../shared/types.schema.json";

const ajv = new Ajv();
const validateRequest = ajv.compile(schema.definitions["SignInBody"]);

const client = new CognitoIdentityProviderClient({ region: process.env.REGION });

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    console.log("Event received:", JSON.stringify(event));

    const body = event.body ? JSON.parse(event.body) : null;
    if (!validateRequest(body)) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Invalid request body",
          errors: ajv.errorsText(validateRequest.errors),
        }),
      };
    }

    const { username, password } = body as SignInBody;

    const command = new InitiateAuthCommand({
      ClientId: process.env.CLIENT_ID!,
      AuthFlow: "USER_PASSWORD_AUTH",
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password,
      },
    });

    const response = await client.send(command);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Signin successful", data: response }),
    };
  } catch (error) {
    console.error("Error during signin:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "An error occurred during signin",
        error: error instanceof Error ? error.message : error,
      }),
    };
  }
};
