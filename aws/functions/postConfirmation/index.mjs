import {
  CognitoIdentityProviderClient,
  AdminAddUserToGroupCommand
} from '@aws-sdk/client-cognito-identity-provider';

const client = new CognitoIdentityProviderClient({});

/**
 * Amazon Cognito PostConfirmation Trigger Lambda
 * Dedicated small function to prevent circular dependency with wmd-backend.
 *
 * Adds new users to the 'citizen' group only on 'PostConfirmation_ConfirmSignUp'.
 * All other events (e.g. PostConfirmation_ConfirmForgotPassword) are returned unchanged.
 */
export const handler = async (event) => {
  if (event.triggerSource === 'PostConfirmation_ConfirmSignUp') {
    const userPoolId = event.userPoolId;
    const username = event.userName;

    console.log(`[postConfirmation] Adding confirmed citizen ${username} to citizen group in pool ${userPoolId}`);

    try {
      await client.send(new AdminAddUserToGroupCommand({
        UserPoolId: userPoolId,
        Username: username,
        GroupName: 'citizen'
      }));
      console.log(`[postConfirmation] Successfully added ${username} to citizen group.`);
    } catch (err) {
      console.error('[postConfirmation] Error adding user to citizen group:', err);
      // Fail open for confirmation so the user account is not locked
    }
  }

  return event;
};
