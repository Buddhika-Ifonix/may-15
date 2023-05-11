import {useNavigation} from '@react-navigation/native';
import React, {useEffect, useState} from 'react';
import {
  SafeAreaView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  PermissionsAndroid,
  ActivityIndicator,
} from 'react-native';
import styles from './Styles';
import {Voximplant} from 'react-native-voximplant';
import {VOXIMPLANT_ACCOUNT, VOXIMPLANT_APP} from './Constants';
import {SCREEN_NAMES} from '../../navigators/screenNames';
import {loginData} from '../../api/api';
import useLoginstatus from '../../hooks/useLoginstatus';

const LoginScreen = () => {
  const navigation = useNavigation();
  const voximplant = Voximplant.getInstance();
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const clientCheck = async () => {
    const state = await voximplant.getClientState();

    if (state === 'logged_in') {
      navigation.navigate(SCREEN_NAMES.Home);
    } else {
      console.log('no');
    }
  };

  useEffect(() => {
    clientCheck();
  }, []);

  async function login() {
    setLoading(true);
    // PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    try {
      let clientState = await voximplant.getClientState();
      if (clientState === Voximplant.ClientState.DISCONNECTED) {
        await voximplant.connect();
        await voximplant.login(
          `${user}@${VOXIMPLANT_APP}.${VOXIMPLANT_ACCOUNT}.voximplant.com`,
          password,
        );
      }
      if (clientState === Voximplant.ClientState.CONNECTED) {
        await voximplant.login(
          `${user}@${VOXIMPLANT_APP}.${VOXIMPLANT_ACCOUNT}.voximplant.com`,
          password,
        );
      }
     
      await loginData({user,password});
      setLoading(false);
      navigation.navigate(SCREEN_NAMES.Home);

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

  function convertCodeMessage(code) {
    switch (code) {
      case 401:
        return 'Invalid password';
      case 404:
        return 'Invalid user';
      case 491:
        return 'Invalid state';
      default:
        return 'Try again later';
    }
  }

  function showLoginError(message) {
    Alert.alert('Login error', message, [
      {
        text: 'OK',
      },
    ]);
  }

  if (loading) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safearea}>
        <View style={[styles.container]}>
          <TextInput
            underlineColorAndroid="transparent"
            style={styles.forminput}
            placeholder="User name"
            autoFocus={true}
            returnKeyType={'next'}
            autoCapitalize="none"
            autoCorrect={false}
            blurOnSubmit={false}
            onChangeText={text => setUser(text)}
          />
          <TextInput
            underlineColorAndroid="transparent"
            style={styles.forminput}
            placeholder="User password"
            secureTextEntry={true}
            onChangeText={text => setPassword(text)}
            blurOnSubmit={true}
          />
          <TouchableOpacity onPress={() => login()} style={styles.button}>
            <Text style={styles.textButton}>LOGIN</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
};

export default LoginScreen;
