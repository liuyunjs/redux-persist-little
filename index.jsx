import React from 'react';
import ReactDOM from 'react-dom';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { createStore, applyMiddleware } from 'redux';
import { createLogger } from 'redux-logger';
import localforage from 'localforage';
import {
  PersistGate,
  DefaultStorage,
  persist,
  persistStore,
} from './library/main';

const count = (state = 0, action) => {
  switch (action.type) {
    case 'add':
      return state + 1;
    case 'sub':
      return state - 1;
    default:
      return state;
  }
};
const count2 = (state = 0, action) => {
  switch (action.type) {
    case 'add':
      return state + 1;
    case 'sub':
      return state - 1;
    default:
      return state;
  }
};

DefaultStorage.set(window.localStorage);

const store = createStore(
  persist(
    {
      count,
      count2,
    },
    {
      // whiteList: ['count'],
      // blackList: ['count2'],
      prefix: 'prefix',
    },
  ),
  applyMiddleware(createLogger()),
);

const persistor = persistStore(store);

const Counter = () => {
  const currentCount = useSelector(
    React.useRef((state) => state.count).current,
  );
  const dispatch = useDispatch();

  return (
    <div style={{ width: 200, height: 300 }}>
      <span>count: {currentCount}</span>
      <button
        onClick={() => {
          dispatch({ type: 'add' });
          dispatch({ type: 'add' });
        }}>
        add
      </button>
      <button onClick={() => dispatch({ type: 'sub' })}>sub</button>
    </div>
  );
};

function App() {
  return (
    <Provider store={store}>
      <PersistGate persistor={persistor}>
        <Counter />
      </PersistGate>
    </Provider>
  );
}

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root'),
);
