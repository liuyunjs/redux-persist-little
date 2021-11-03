import { useLayoutEffect, useRef, useState } from 'react';
import {
  Reducer,
  Store,
  combineReducers,
  ReducersMapObject,
  CombinedState,
  StateFromReducersMapObject,
  ActionFromReducersMapObject,
} from 'redux';
import { isPromise } from '@liuyunjs/utils/lib/isPromise';
import { isFunction } from '@liuyunjs/utils/lib/isFunction';
import { isString } from '@liuyunjs/utils/lib/isString';

type StateFromReducer<T extends Reducer> = T extends Reducer<infer S, any>
  ? S
  : never;
type ActionFromReducer<T extends Reducer> = T extends Reducer<any, infer A>
  ? A
  : never;

type PersistStorageInput = {
  getItem: (key: string) => string | null | Promise<string> | Promise<null>;
  removeItem: (key: string) => void | Promise<void>;
  setItem: (key: string, value: string) => void | Promise<void>;
};

type PersistReducerOptions = {
  key: string;
  storage?: PersistStorageInput;
  expired?: number;
};
type PersistReducersOptions<M> = {
  whiteList?: (keyof M)[];
  blackList?: (keyof M)[];
  storage?: PersistStorageInput;
  expired?: number;
  prefix?: string;
};

const PERSIST_TYPE = 'PERSIST/RESTORE';

const DEFAULT_VALUE = [] as const;

const persistPool: Record<
  string,
  { storage: PersistStorage; expired?: number }
> = {};

let defaultStorage: PersistStorageInput;

export const DefaultStorage = {
  set(storage: PersistStorageInput) {
    defaultStorage = storage;
  },
};

const maybePromise = <T extends any>(
  promiseOrValue: Promise<T> | T,
  callback: (value: T) => any,
) => {
  if (isPromise(promiseOrValue)) {
    return promiseOrValue.then(callback);
  }
  return callback(promiseOrValue);
};

class PersistStorage {
  private readonly _pool = new Map<string, any>();

  constructor(private readonly _storage: PersistStorageInput) {}

  getItem(key: string, expired?: number) {
    const result = this._storage.getItem(key);
    return maybePromise(result, (value) => {
      if (value == null) return DEFAULT_VALUE;
      try {
        const ret = JSON.parse(value);
        if (!persistPool[key] || (expired && Date.now() - ret[1] >= expired)) {
          this.removeItem(key);
          return DEFAULT_VALUE;
        }
        return ret[0];
      } catch {
        return DEFAULT_VALUE;
      }
    });
  }

  setItem(key: string, value: any) {
    this._startSaveQueue();
    this._pool.set(key, value);
  }

  removeItem(key: string) {
    this._storage.removeItem(key);
  }

  private _startSaveQueue() {
    if (this._pool.size) return;

    setTimeout(() => {
      this._pool.forEach((value, key) => {
        this._storage.setItem(key, JSON.stringify([value, Date.now()]));
      });

      this._pool.clear();
    }, 100);
  }
}

const storagePool =
  typeof WeakMap !== 'undefined'
    ? new WeakMap<PersistStorageInput, PersistStorage>()
    : new Map<PersistStorageInput, PersistStorage>();

const storageAdapter = (storage: PersistStorageInput = defaultStorage) => {
  if (!storage)
    throw new Error(
      '请传入 storage 或者使用 DefaultStorage.set 设置默认 storage',
    );

  if (storagePool.has(storage)) return storagePool.get(storage)!;

  const persistStorage = new PersistStorage(storage);
  storagePool.set(storage, persistStorage);
  return persistStorage;
};

const dispatchStore = (store: Store, result: [string, any][]) => {
  store.dispatch({
    type: PERSIST_TYPE,
    payload: result.reduce((previousValue, currentValue) => {
      if (currentValue[1] !== DEFAULT_VALUE) {
        previousValue[currentValue[0]] = currentValue[1];
      }
      return previousValue;
    }, {} as Record<string, any>),
  });
  return true;
};

export const persistStore = (store: Store) => {
  const keys = Object.keys(persistPool);
  // if (!keys.length) return true;
  let promises: Promise<[string, any]>[] = [];
  let result: [string, any][] = [];

  keys.forEach((key) => {
    const ret = persistPool[key].storage.getItem(key, persistPool[key].expired);
    if (isPromise(ret)) {
      promises.push(
        ret.then((value) => {
          return [key, value];
        }),
      );
    } else {
      result.push([key, ret]);
    }
  });

  if (promises.length) {
    return Promise.all(promises).then((promiseResult) =>
      dispatchStore(store, result.concat(promiseResult)),
    );
  }
  return dispatchStore(store, result);
};

const persistReducer = <T extends Reducer>(
  reducer: T,
  { key, expired, storage: storageInput }: PersistReducerOptions,
): T => {
  let prevState: StateFromReducer<T>;

  const storage = storageAdapter(storageInput);

  persistPool[key] = { storage, expired };

  return ((
    state: StateFromReducer<T> | undefined,
    action: ActionFromReducer<T>,
  ) => {
    if (action.type === PERSIST_TYPE) {
      if (key in action.payload) {
        return (prevState = action.payload[key] as StateFromReducer<T>);
      }

      return (prevState = state!);
    }

    const newState = reducer(state, action);
    if (
      (!isString(action.type) || action.type.indexOf('@@redux/') !== 0) &&
      prevState !== newState
    ) {
      storage.setItem(key, newState);
    }
    return (prevState = newState);
  }) as T;
};

function persistReducers<M extends ReducersMapObject<any, any>>(
  reducers: M,
  {
    whiteList,
    blackList,
    expired,
    storage,
    prefix,
  }: PersistReducersOptions<M> = {},
): Reducer<
  CombinedState<StateFromReducersMapObject<M>>,
  ActionFromReducersMapObject<M>
> {
  return combineReducers<M>(
    Object.keys(reducers).reduce((prev, key) => {
      const needPersist = whiteList
        ? whiteList.indexOf(key) !== -1
        : blackList
        ? blackList.indexOf(key) === -1
        : true;

      // @ts-ignore
      prev[key] = needPersist
        ? persistReducer(reducers[key], {
            key: prefix ? prefix + '.' + key : key,
            expired,
            storage,
          })
        : reducers[key];
      return prev;
    }, {} as M),
  );
}

export function persist<T extends Reducer>(
  reducer: T,
  options: PersistReducerOptions,
): T;
export function persist<M extends ReducersMapObject<any, any>>(
  reducers: M,
  options?: PersistReducersOptions<M>,
): Reducer<
  CombinedState<StateFromReducersMapObject<M>>,
  ActionFromReducersMapObject<M>
>;
export function persist(reducer: any, options: any) {
  if (isFunction(reducer)) {
    return persistReducer(reducer, options);
  }
  return persistReducers(reducer, options);
}

export const PersistGate: React.FC<{
  persistor: ReturnType<typeof persistStore>;
  fallback?: React.ReactElement | null;
  children?: React.ReactElement | null;
}> = ({ persistor, children = null, fallback = null }) => {
  const unmountedRef = useRef(false);
  const [persistState, setPersistState] = useState(() => {
    if (isPromise(persistor)) {
      persistor.then((p) => {
        if (unmountedRef.current) return;
        setPersistState(p);
      });

      return false;
    }
    return persistor;
  });

  useLayoutEffect(
    () => () => {
      unmountedRef.current = true;
    },
    [],
  );

  return persistState ? children! : fallback;
};
