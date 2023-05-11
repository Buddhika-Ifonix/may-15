import AsyncStorage from "@react-native-async-storage/async-storage";

const FCM_SERVER_URL =
"https://call-api-production.up.railway.app";



export const loginData = async (data) => {


  const jsonValue = JSON.stringify(data)
  await AsyncStorage.setItem('loginData', jsonValue)


};


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
      console.log(" RESP", response);
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
