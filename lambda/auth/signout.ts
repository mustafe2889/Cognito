import { CognitoIdentityProviderClient, GlobalSignOutCommand } from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient({ region: process.env.REGION });

export const handler = async (event: any) => {
  try {
    const { accessToken } = JSON.parse(event.body);
    const command = new GlobalSignOutCommand({
      AccessToken: accessToken,
    });
    await client.send(command);
    return { statusCode: 200, body: JSON.stringify({ message: "User signed out successfully!" }) };
  } catch (error: any) {
    return { statusCode: 400, body: JSON.stringify({ message: "Signout failed", error: error.message }) };
  }
};
