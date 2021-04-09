const { App } = require("@slack/bolt");
const jsforce = require("jsforce"); //jsforce open source library to connect to Salesforce
const { getToken } = require("sf-jwt-token");

// create the connection to the org
let connection = new jsforce.Connection();

//JWT Token authentication
fetchToken().then((jwttokenresponse) => {
  console.log(jwttokenresponse);
  connection.initialize({
    instanceUrl: jwttokenresponse.instance_url,
    accessToken: jwttokenresponse.access_token,
  });
});
async function fetchToken() {
  const jwttokenresponse = await getToken({
    iss: process.env.CLIENT_ID,
    sub: process.env.USERNAME,
    aud: process.env.LOGIN_URL,
    privateKey: process.env.PRIVATE_KEY,
  });
  return jwttokenresponse;
}

// Initializes your app with your bot token and signing secret
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

// Command to render button for Salesforce Connection
app.command("/connectsf", async ({ command, ack, say }) => {
  // Acknowledge command request
  await ack();
  const salesforce_url = `https://login.salesforce.com/services/oauth2/authorize?client_id=${process.env.SALESFORCE_CLIENT_ID}&redirect_uri=${process.env.SALESFORCE_REDIRECT_URL}&response_type=code`;
  await say(renderAuthorizeButton(salesforce_url));
});

// Command to Acknowledge when Authorize Button is clicked
app.action("authorize_sf", async ({ command, ack, say }) => {
  await ack();
});

// Command to query Userinfo from Salesforce and display a Block UI
app.command("/whoami", async ({ command, ack, say }) => {
  // Acknowledge command request
  await ack();
  await connection.identity(function (err, res) {
    if (err) {
      const salesforce_url = `https://login.salesforce.com/services/oauth2/authorize?client_id=${process.env.SALESFORCE_CLIENT_ID}&redirect_uri=${process.env.SALESFORCE_REDIRECT_URL}&response_type=code`;
      say(renderAuthorizeButton(salesforce_url));
      return console.error(err);
    }
    try {
      say(renderWhoamiBlock(res));
    } catch (e) {
      console.log(e);
    }
  });
});

// renders Whoami Block
function renderWhoamiBlock(res) {
  return {
    blocks: [
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: "*User ID*",
          },
          {
            type: "mrkdwn",
            text: "*Name*",
          },
          {
            type: "plain_text",
            text: `${res.user_id}`,
          },
          {
            type: "plain_text",
            text: `${res.username}`,
          },
          {
            type: "mrkdwn",
            text: "*Display Name*",
          },
          {
            type: "mrkdwn",
            text: "*Organization ID*",
          },
          {
            type: "plain_text",
            text: `${res.organization_id}`,
          },
          {
            type: "plain_text",
            text: `${res.display_name}`,
          },
        ],
      },
    ],
  };
}

// Block SDK for returning the Authorize Button
function renderAuthorizeButton(salesforce_url) {
  return {
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "To login into Salesforce click the button below",
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "Authorize Salesforce",
            },
            style: "primary",
            value: "authsf",
            url: salesforce_url,
            action_id: "authorize_sf",
          },
        ],
      },
    ],
  };
}

(async () => {
  // Start your app
  await app.start(process.env.PORT || 3000);

  console.log("⚡️ Bolt app is running!");
})();
