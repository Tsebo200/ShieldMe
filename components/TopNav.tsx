import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { Draggable } from 'react-native-reanimated-dnd'

const TopNav = () => {
  return (
    <GestureHandlerRootView>
    <View style={styles.topContainer}>
    <Text style={styles.introText}>Hello, Skywalker</Text>


<Draggable data={{ id: '1', title: 'Task Item' }}>

    <View style={[styles.icon]} ></View>
</Draggable>
    </View>
    </GestureHandlerRootView>

  )
}

export default TopNav

const styles = StyleSheet.create({
topContainer:{
        flex: 1,
        // backgroundColor: 'red',
        flexDirection: 'row',
        padding: 5,
        justifyContent: 'center',
        alignContent: 'center',
        alignItems: 'center',
        // marginBlockEnd: 10,
    },
    introText:{
        fontSize: 20,
        flex: 0.9,
        // color: 'black',
        // margin: 15,
        // backgroundColor: 'grey',
        alignSelf: 'center',
        textAlign: 'left',
    },
    icon:{
        width: 50,
        height: 50,
        backgroundColor: 'blue',
        borderRadius: 25,
        alignSelf: 'center',
        elevation: 3,
    },
})