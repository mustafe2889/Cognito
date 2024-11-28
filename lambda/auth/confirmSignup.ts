import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { ConfirmSignUpBody } from "../../shared/types";
import {
  CognitoIdentityProviderClient,
  ConfirmSignUpCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import Ajv from "ajv";
import schema from "../../shared/types.schema.json";

const ajv = new Ajv();
const validateRequest = ajv.compile(schema.definitions["ConfirmSignUpBody"]);

const client = new CognitoIdentityProviderClient({ region: process.env.REGION });

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    console.log("Event received:", JSON.stringify(event));

    // Parse and validate the request body
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

    const { code, username } = body as ConfirmSignUpBody;

    const command = new ConfirmSignUpCommand({
      ClientId: process.env.CLIENT_ID!,
      Username: username,
      ConfirmationCode: code,
    });

    await client.send(command);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Signup confirmed successfully" }),
    };
  } catch (error) {
    console.error("Error during confirmation:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "An error occurred during confirmation",
        error: error instanceof Error ? error.message : error,
      }),
    };
  }
};
