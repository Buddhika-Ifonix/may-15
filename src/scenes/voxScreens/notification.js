import messaging from '@react-native-firebase/messaging';

export const getFcmToken = async () => {
    try {
      const newFcmToken = await messaging().getToken();
      console.log(newFcmToken);
      return newFcmToken;
    } catch (error) {
      console.error(error);
      return null;
    }
  };