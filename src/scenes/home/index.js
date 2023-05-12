import React, {useEffect, useState, useRef} from 'react';
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
} from 'react-native';
import {ScrollView, TouchableOpacity} from 'react-native-gesture-handler';
import {CallEnd, Copy} from '../../assets/icons';
import TextInputContainer from '../../components/TextInputContainer';
import colors from '../../styles/colors';
import {ROBOTO_FONTS} from '../../styles/fonts';
import firestore from '@react-native-firebase/firestore';
import messaging from '@react-native-firebase/messaging';
import Toast from 'react-native-simple-toast';
import {
  updateCallStatus,
  initiateCall,
  getToken,
  createMeeting,
} from '../../api/api';
import {SCREEN_NAMES} from '../../navigators/screenNames';
import Incomingvideocall from '../../utils/incoming-video-call';
import VoipPushNotification from 'react-native-voip-push-notification';
import calls from '../voxScreens/Store';
import {Voximplant} from 'react-native-voximplant';
import useLogout from '../../hooks/useLogout';
import useLoginstatus from '../../hooks/useLoginstatus';
import {VOXIMPLANT_ACCOUNT, VOXIMPLANT_APP} from '../voxScreens/Constants';


export default function Home({navigation}) {
  const [number, setNumber] = useState('');
  const [names, setNames] = useState([
    {id: '1', name: 'tinith', callerId: '34437659'},
    {id: '2', name: 'umanda', callerId: '68852771'},
    {id: '3', name: 'promo', callerId: '47780587'},
    {id: '4', name: 'tharaka', callerId: '47697337'},
    {id: '5', name: 'dinusha', callerId: '37109510'},


  ]);
  const [firebaseUserConfig, setfirebaseUserConfig] = useState(null);
  const [isCalling, setisCalling] = useState(false);

 const [video , setVideo] = useState({})

  const [APN, setAPN] = useState(null);

  const APNRef = useRef();

  APNRef.current = APN;

  const [callee, setCallee] = useState('');
  const voximplant = Voximplant.getInstance();

  const [userInfo, setUserInfo] = useState({});

  const clientCheck = async () => {
    const loginData = await useLoginstatus();
    const state = await voximplant.getClientState();


    if (loginData) {
      const temPusers = names.filter(name => name.name != loginData.user)
      
   setNames(temPusers);
    } else {
      navigation.navigate(SCREEN_NAMES.Login);
    }
   
  };
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log(names)
      clientCheck();
    });

    return unsubscribe;
  }, []);



  
  // useEffect(
  //   () =>
  //     navigation.addListener('beforeRemove', (e) => {
  //       e.preventDefault();

  //     }),
  //   []
  // );
  function showLoginError(message) {
    Alert.alert('Login error', message, [
      {
        text: 'OK',
      },
    ]);
  }

  useEffect(() => {
    async function login() {
      const loginData = await useLoginstatus();

      // PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      if (loginData?.user) {
        try {
          let clientState = await voximplant.getClientState();
          if (clientState === Voximplant.ClientState.DISCONNECTED) {
            await voximplant.connect();
            await voximplant.login(
              `${loginData.user}@${VOXIMPLANT_APP}.${VOXIMPLANT_ACCOUNT}.voximplant.com`,
              loginData.password,
            );
          }
          if (clientState === Voximplant.ClientState.CONNECTED) {
            await voximplant.login(
              `${loginData.user}@${VOXIMPLANT_APP}.${VOXIMPLANT_ACCOUNT}.voximplant.com`,
              loginData.password,
            );
          }
        } catch (e) {
          let message;
          switch (e.name) {
            case Voximplant.ClientEvents.ConnectionFailed:
              message = 'Connection error, check your internet connection';
              break;
            case Voximplant.ClientEvents.AuthResult:
              message = convertCodeMessage(e.code);
              break;
            default:
              message = 'Unknown error. Try again';
          }
          showLoginError(message);
        }
      }
    }

    login();
  }, []);

  useEffect(() => {
    async function getFCMtoken() {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      Platform.OS === 'ios' && VoipPushNotification.registerVoipToken();

      if (enabled) {
        const token = await messaging().getToken();
        const querySnapshot = await firestore()
          .collection('users')
          .where('token', '==', token)
          .get();

        const uids = querySnapshot.docs.map(doc => {
          if (doc && doc?.data()?.callerId) {
            const {token, platform, APN, callerId} = doc?.data();
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
          addUser({token});
        } else {
          console.log('Token Found');
        }
      }
    }

    getFCMtoken();
  }, []);

  ///vox configuration
  useEffect(() => {
    voximplant.on(Voximplant.ClientEvents.IncomingCall, incomingCallEvent => {
      calls.set(incomingCallEvent.call.callId, incomingCallEvent.call);
     setTimeout(() => {
      navigation.navigate(SCREEN_NAMES.InCall, {
        callId: incomingCallEvent.call.callId,
        callType: video.callType
      });
     }, );
    //  navigation.navigate(SCREEN_NAMES.InCall, {
    //     callId: incomingCallEvent.call.callId,
    //     callType: video.callType
    //   });
      
    });
    return function cleanup() {
      voximplant.off(Voximplant.ClientEvents.IncomingCall);
    };
  });

  async function makeCall({isVideoCall, name}) {
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

      const navfunc = () => {};
    } catch (e) {
      console.warn(`MainScreen: makeCall failed: ${e}`);
    }
  }

  ///vox configuration
  useEffect(() => {
    const unsubscribe = messaging().onMessage(remoteMessage => {
      const {callerInfo, type} = JSON.parse(remoteMessage.data.info);
      console.log(callerInfo)
      setVideo(callerInfo)
      switch (type) {
        case 'CALL_INITIATED':
          const incomingCallAnswer = ({callUUID}) => {
            updateCallStatus({
              callerInfo,
              type: 'ACCEPTED',
            });
            Incomingvideocall.endIncomingcallAnswer(callUUID);
            setisCalling(false);
          };

          const endIncomingCall = () => {
            Incomingvideocall.endIncomingcallAnswer();
            updateCallStatus({callerInfo, type: 'REJECTED'});
          };

          Incomingvideocall.configure(incomingCallAnswer, endIncomingCall);
          Incomingvideocall.displayIncomingCall(callerInfo.name);

          break;
        case 'ACCEPTED':
          setisCalling(false);
          // navigation.navigate(SCREEN_NAMES.Test);
         
          makeCall({isVideoCall: callerInfo.callType, name:callerInfo.name, });
          break;
        case 'REJECTED':
          console.log('Call Rejected');
          setisCalling(false);
          break;
        case 'DISCONNECT':
          Platform.OS === 'ios'
            ? Incomingvideocall.endAllCall()
            : Incomingvideocall.endIncomingcallAnswer();
          break;
        default:
          console.log('Call Could not placed');
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    VoipPushNotification.addEventListener('register', token => {
      setAPN(token);
    });

    VoipPushNotification.addEventListener('notification', notification => {
      if (type === 'CALL_INITIATED') {
        const incomingCallAnswer = ({callUUID}) => {
          updateCallStatus({
            callerInfo,
            type: 'ACCEPTED',
          });
        };
        const endIncomingCall = () => {
          Incomingvideocall.endAllCall();
          updateCallStatus({callerInfo, type: 'REJECTED'});
        };
        Incomingvideocall.configure(incomingCallAnswer, endIncomingCall);
      } else if (type === 'DISCONNECT') {
        Incomingvideocall.endAllCall();
      }
      VoipPushNotification.onVoipNotificationCompleted(notification.uuid);
    });

    VoipPushNotification.addEventListener('didLoadWithEvents', events => {
      const {callerInfo, type} = events.length > 1 && events[1].data;
      if (type === 'CALL_INITIATED') {
        const incomingCallAnswer = ({callUUID}) => {
          updateCallStatus({
            callerInfo,
            type: 'ACCEPTED',
          });
        };

        const endIncomingCall = () => {
          Incomingvideocall.endAllCall();
          updateCallStatus({callerInfo, type: 'REJECTED'});
        };

        Incomingvideocall.configure(incomingCallAnswer, endIncomingCall);
      }
    });

    return () => {
      VoipPushNotification.removeEventListener('didLoadWithEvents');
      VoipPushNotification.removeEventListener('register');
      VoipPushNotification.removeEventListener('notification');
    };
  }, []);

  const addUser = ({token}) => {
    const platform = Platform.OS === 'android' ? 'ANDROID' : 'iOS';
    const obj = {
      callerId: Math.floor(10000000 + Math.random() * 90000000).toString(),
      token,
      platform,
    };
    if (platform == 'iOS') {
      obj.APN = APNRef.current;
    }
    firestore()
      .collection('users')
      .add(obj)
      .then(() => {
        setfirebaseUserConfig(obj);
        console.log('User added!');
      });
  };

  const getCallee = async num => {
    const querySnapshot = await firestore()
      .collection('users')
      .where('callerId', '==', num.toString())
      .get();
    return querySnapshot.docs.map(doc => {
      return doc;
    });
  };

  const logoutHandler = async () => {
    await voximplant.disconnect();
    await useLogout();
    navigation.navigate(SCREEN_NAMES.Login);
    console.log('logged out');
  };

  return (
    <>{!isCalling ? ( <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {names.map(name => (
          <TouchableOpacity
            key={name.id}
            style={styles.contact}
            onPress={async () => {
              if (name.callerId) {
                const data = await getCallee(name.callerId);
                if (data) {
                  if (data.length === 0) {
                    console.log('CallerId Does not Match');
                  } else {
                    const {token, platform, APN} = data[0]?.data();
                    Alert.alert('', 'Pick Call Type', [
                      { text: "Cancel Call", style: 'cancel', onPress: () => {}},
                      {
                        text: "Video Call",
                        style: 'destructive',
                        onPress: () => {
                          setisCalling(true);
                          initiateCall({
                            callerInfo: {
                              name: name.name,
                              callType: true,
                             
                              ...firebaseUserConfig,
                            },
                            calleeInfo: {
                              token,
                              platform,
                              APN,
                            },
                          });
                        },
                      },
                      {
                        text: 'Voice Call',
                        style: 'destructive',
                        // If the user confirmed, then we dispatch the action we blocked earlier
                        // This will continue the action that had triggered the removal of the screen
                        onPress: () => {
                          setisCalling(true);
                          // setVideo(false)
                          initiateCall({
                            callerInfo: {
                              name: name.name,
                              callType: false,
                              ...firebaseUserConfig,
                            },
                            calleeInfo: {
                              token,
                              platform,
                              APN,
                            },
                          });
                        },
                        
                      },
                    ]);

                    
                  }
                }
              } else {
                console.log('Please provide CallerId');
              }
            }}>
            <Text style={styles.contactName}>{name.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <TouchableOpacity onPress={logoutHandler}>
        <Text style={styles.contactName}>LogOut</Text>
      </TouchableOpacity>
    </View>):(
      <View style={{ flex: 1, justifyContent: "space-around" }}>
      <View
        style={{
          padding: 35,
          justifyContent: "center",
          alignItems: "center",
          borderRadius: 14,
        }}
      >
        <Text
          style={{
            fontSize: 16,
            color: "#D0D4DD",
            fontFamily: ROBOTO_FONTS.Roboto,
          }}
        >
          Calling ...
        </Text>

        <Text
          style={{
            fontSize: 36,
            marginTop: 12,
            color: "#ffff",
            letterSpacing: 8,
            fontFamily: ROBOTO_FONTS.Roboto,
          }}
        >
          {number}
        </Text>
      </View>
      <View
        style={{
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <TouchableOpacity
          onPress={async () => {
            const data = await getCallee(number);
            if (data) {
              updateCallStatus({
                callerInfo: data[0]?.data(),
                type: "DISCONNECT",
              });
              setisCalling(false);
            }
          }}
          style={{
            backgroundColor: "#FF5D5D",
            borderRadius: 30,
            height: 60,
            aspectRatio: 1,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <CallEnd width={50} height={12} />
        </TouchableOpacity>
      </View>
    </View>
    )}
    
    </>
   
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
