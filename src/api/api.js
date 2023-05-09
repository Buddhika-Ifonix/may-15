const API_BASE_URL = "https://api.videosdk.live/v2";
const VIDEOSDK_TOKEN = '32030093-af1e-4f07-841b-3f27468d8c7e'
// "http://192.168.1.12:9000";
const FCM_SERVER_URL =
"http://192.168.8.152:9000";



export const initiateCall = async ({
  callerInfo,
  calleeInfo,
  videoSDKInfo,
}) => {
  await fetch(`${FCM_SERVER_URL}/initiate-call`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      callerInfo,
      calleeInfo,
      videoSDKInfo,
    }),
  })
    .then((response) => {
      // console.log(" RESP", response);
    })
    .catch((error) => console.error("error", error));
};

export const updateCallStatus = async ({ callerInfo, type }) => {
  await fetch(`${FCM_SERVER_URL}/update-call`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      callerInfo,
      type,
    }),
  })
    .then((response) => {
      // console.log("##RESP", response);
    })
    .catch((error) => console.error("error", error));
};
