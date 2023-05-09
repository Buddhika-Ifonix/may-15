import React, { useEffect, useState, useRef } from "react";
import {
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  View,
  Text,
  Clipboard,

  PermissionsAndroid,
  Alert,
  Linking,
  StyleSheet,
} from "react-native";
import { ScrollView, TouchableOpacity } from "react-native-gesture-handler";
import { CallEnd, Copy } from "../../assets/icons";
import TextInputContainer from "../../components/TextInputContainer";
import colors from "../../styles/colors";
import { ROBOTO_FONTS } from "../../styles/fonts";
import firestore from "@react-native-firebase/firestore";
import messaging from "@react-native-firebase/messaging";
import Toast from "react-native-simple-toast";
import {
  updateCallStatus,
  initiateCall,
  getToken,
  createMeeting,
} from "../../api/api";
import { SCREEN_NAMES } from "../../navigators/screenNames";
import Incomingvideocall from "../../utils/incoming-video-call";
import VoipPushNotification from "react-native-voip-push-notification";
import calls from '../voxScreens/Store';
import {Voximplant} from 'react-native-voximplant';

export default function Home({ navigation }) {
  const [number, setNumber] = useState("");
  const [names, setNames] = useState([
    { id: '1', name: 'tinith',callerId:'60018634' },
    { id: '2', name: 'umanda',callerId:'96701489' },
    { id: '3', name: 'Charlie' },
    { id: '4', name: 'David' },
    { id: '5', name: 'Eve' },
  ]);
  const [firebaseUserConfig, setfirebaseUserConfig] = useState(null);
  const [isCalling, setisCalling] = useState(false);

  const [APN, setAPN] = useState(null);

  const APNRef = useRef();

  APNRef.current = APN;

 
  const [callee, setCallee] = useState('');
  const voximplant = Voximplant.getInstance();

  useEffect(() => {
    async function getFCMtoken() {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      Platform.OS === "ios" && VoipPushNotification.registerVoipToken();

      if (enabled) {
        const token = await messaging().getToken();
        const querySnapshot = await firestore()
          .collection("users")
          .where("token", "==", token)
          .get();

        const uids = querySnapshot.docs.map((doc) => {
          if (doc && doc?.data()?.callerId) {
           
            const { token, platform, APN, callerId } = doc?.data();
            setfirebaseUserConfig({
              callerId,
              token,
              platform,
              APN,
              // claller: 'caller buwa'
            });
          }
          return doc;
        });

        if (uids && uids.length == 0) {
          addUser({ token });
        } else {
          console.log("Token Found");
        }
      }
    }

   
    getFCMtoken();
  
   
  }, []);


  ///vox configuration
  useEffect(() => {
    voximplant.on(Voximplant.ClientEvents.IncomingCall, incomingCallEvent => {
      calls.set(incomingCallEvent.call.callId, incomingCallEvent.call);
      navigation.navigate(SCREEN_NAMES.InCall, {
        callId: incomingCallEvent.call.callId,
      });
    });
    return function cleanup() {
      voximplant.off(Voximplant.ClientEvents.IncomingCall);
    };
  });

  async function makeCall({isVideoCall,name}) {
    try {
      if (Platform.OS === 'android') {
        let permissions = [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];
        if (isVideoCall) {
          permissions.push(PermissionsAndroid.PERMISSIONS.CAMERA);
        }
        const granted = await PermissionsAndroid.requestMultiple(permissions);
        const recordAudioGranted =
          granted[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === 'granted';
        const cameraGranted =
          granted[PermissionsAndroid.PERMISSIONS.CAMERA] === 'granted';
        if (recordAudioGranted) {
          if (isVideoCall && !cameraGranted) {
            console.warn(
              'MainScreen: makeCall: camera permission is not granted',
            );
            return;
          }
        } else {
          console.warn(
            'MainScreen: makeCall: record audio permission is not granted',
          );
          return;
        }
      }
   
      navigation.navigate(SCREEN_NAMES.Call, {
        isVideoCall: isVideoCall,
        callee: name,
        isIncomingCall: false,
      });

      const navfunc = () => {
        
      }
    } catch (e) {
      console.warn(`MainScreen: makeCall failed: ${e}`);
    }
  }

///vox configuration
  useEffect(() => {
    const unsubscribe = messaging().onMessage((remoteMessage) => {
      const { callerInfo, type } = JSON.parse(
        remoteMessage.data.info
      );
      console.log(callerInfo)
      switch (type) {
        case "CALL_INITIATED":
          const incomingCallAnswer = ({ callUUID }) => {
            updateCallStatus({
              callerInfo,
              type: "ACCEPTED",
            });
            Incomingvideocall.endIncomingcallAnswer(callUUID);
            setisCalling(false);
           
          };

          const endIncomingCall = () => {
            Incomingvideocall.endIncomingcallAnswer();
            updateCallStatus({ callerInfo, type: "REJECTED" });
          };

          Incomingvideocall.configure(incomingCallAnswer, endIncomingCall);
          Incomingvideocall.displayIncomingCall(callerInfo.name);

          break;
        case "ACCEPTED":
          setisCalling(false);
          // navigation.navigate(SCREEN_NAMES.Test);
          makeCall({isVideoCall: true,name:callerInfo.name});
          break;
        case "REJECTED":
          console.log("Call Rejected");
          setisCalling(false);
          break;
        case "DISCONNECT":
          Platform.OS === "ios"
            ? Incomingvideocall.endAllCall()
            : Incomingvideocall.endIncomingcallAnswer();
          break;
        default:
          console.log("Call Could not placed");
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    VoipPushNotification.addEventListener("register", (token) => {
      setAPN(token);
    });

    VoipPushNotification.addEventListener("notification", (notification) => {
      if (type === "CALL_INITIATED") {
        const incomingCallAnswer = ({ callUUID }) => {
          updateCallStatus({
            callerInfo,
            type: "ACCEPTED",
          });
         
        };
        const endIncomingCall = () => {
          Incomingvideocall.endAllCall();
          updateCallStatus({ callerInfo, type: "REJECTED" });
        };
        Incomingvideocall.configure(incomingCallAnswer, endIncomingCall);
      } else if (type === "DISCONNECT") {
        Incomingvideocall.endAllCall();
      }
      VoipPushNotification.onVoipNotificationCompleted(notification.uuid);
    });

    VoipPushNotification.addEventListener("didLoadWithEvents", (events) => {
      const { callerInfo, type } =
        events.length > 1 && events[1].data;
      if (type === "CALL_INITIATED") {
        const incomingCallAnswer = ({ callUUID }) => {
          updateCallStatus({
            callerInfo,
            type: "ACCEPTED",
          });
        
        
        };

        const endIncomingCall = () => {
          Incomingvideocall.endAllCall();
          updateCallStatus({ callerInfo, type: "REJECTED" });
        };

        Incomingvideocall.configure(incomingCallAnswer, endIncomingCall);
      }
    });

    return () => {
      VoipPushNotification.removeEventListener("didLoadWithEvents");
      VoipPushNotification.removeEventListener("register");
      VoipPushNotification.removeEventListener("notification");
    };
  }, []);

  const addUser = ({ token }) => {
    const platform = Platform.OS === "android" ? "ANDROID" : "iOS";
    const obj = {
      callerId: Math.floor(10000000 + Math.random() * 90000000).toString(),
      token,
      platform,
    };
    if (platform == "iOS") {
      obj.APN = APNRef.current;
    }
    firestore()
      .collection("users")
      .add(obj)
      .then(() => {
        setfirebaseUserConfig(obj);
        console.log("User added!");
      });
  };

  const getCallee = async (num) => {
    const querySnapshot = await firestore()
      .collection("users")
      .where("callerId", "==", num.toString())
      .get();
    return querySnapshot.docs.map((doc) => {
      return doc;
    });
  };
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {names.map((name) => (
          <TouchableOpacity
            key={name.id}
            style={styles.contact}
            onPress={async () => {
              if (name.callerId) {
                const data = await getCallee(name.callerId);
                if (data) {
                  if (data.length === 0) {
                    console.log("CallerId Does not Match");
                  } else {
                    console.log("CallerId Match!");
                    const { token, platform, APN } = data[0]?.data();
                    initiateCall({
                      callerInfo: {
                        name: name.name,
                        ...firebaseUserConfig,
                      },
                      calleeInfo: {
                        token,
                        platform,
                        APN,
                      },
                     
                    });
                    setisCalling(true);
                  }
                }
              } else {
                console.log("Please provide CallerId");
              }
            }}
          
          >
            <Text style={styles.contactName}>{name.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 10,
  },
  scrollContainer: {
    paddingHorizontal: 20,
  },
  contact: {
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingVertical: 10,
  },
  contactName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#555',
  },
});