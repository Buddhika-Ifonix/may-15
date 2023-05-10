import AsyncStorage from "@react-native-async-storage/async-storage"


const useLoginstatus = async() => {
    const userData = await AsyncStorage.getItem('loginData')
    const jsonData = JSON.parse(userData)

    return jsonData
  
}


export default useLoginstatus