import AsyncStorage from "@react-native-async-storage/async-storage"


const useLogout = async() => {
     await AsyncStorage.removeItem('loginData')


    return 
  
}


export default useLogout