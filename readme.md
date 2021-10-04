# redux-persist-little
对 redux 的状态进行持久化，支持多种存储方式如： localStorage、sessionStorage、localforage 或者react-native AsyncStorage 等

## 安装
### yarn
```shell
yarn add redux-persist-little
```
### npm
```shell
npm install redux-persist-little --save
```

## API
### persist
1. 包裹单个reducer
```typescript
import {persist} from 'redux-persist-little';

const reducer = persist(countReducer, {
    //必传参数 存储的 键
    key: 'count',
    //可选参数 指定存储引擎，localStorage、sessionStorage、localforage 或者react-native AsyncStorage 等
    storage: window.localStorage,
    //可选参数 过期时间，单位毫秒，不传或者传null是不过期
    expired: 1000 * 60 * 60 * 24
})
```
2. 当做 combineReducers 使用，是对 combineReducers 的封装，可一次设置多个持久化状态
```typescript

import {persist} from 'redux-persist-little';

const reducer = persist(
    {
        count: countReducer,
        count2: countReducer,
    },
    {
        // 可选参数 白名单，指定需要持久化的状态
        whiteList: ['count'],
        // 可选参数 黑名单，排除不需要持久化的状态，优先级比白名单低，设置了白名单就不会生效
        blackList: ['count2'],
        // 可选参数 存储的键前缀， 例如 count 存储的键就是 countPredix.count
        prefix: 'countPredix',
        //可选参数 指定存储引擎，localStorage、sessionStorage、localforage 或者react-native AsyncStorage 等
        storage: window.localStorage,
        //可选参数 过期时间，单位毫秒，不传或者传null是不过期
        expired: 1000 * 60 * 60 * 24
    },
)
```
### DefaultStorage
设置默认的存储引擎，当调用 persist 时未传入 storage 时会使用

```typescript

import {DefaultStorage} from 'redux-persist-little';
DefaultStorage.set(window.localStorage)
```
### persistStore
开启store的恢复
```typescript
import {createStore} from "redux";
import {persistStore} from 'redux-persist-little';

const store = createStore(reducer);

const persistor = persistStore(store);
```

### PersistGate
一个 react 组件，包裹在组件的外层，会在store中的数据恢复完成后再渲染我们的组件

```typescript jsx
import {Provider} from "react-redux";
import {PersistGate} from 'redux-persist-little';

const App = () => {
    return (
        <Provider store={store}>
            <PersistGate persistor={persistor}>
                <Root />
            </PersistGate>
        </Provider>
    )
}
```
