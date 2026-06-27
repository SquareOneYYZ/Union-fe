import { useRef, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import Clarity from '@microsoft/clarity';
import { errorsActions } from './store';

export const usePrevious = (value) => {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
};

const fireClarity = (error) => {
  try {
    Clarity.event('app_error');
    Clarity.set('error_message', error.message?.split('\n')[0] || 'unknown');
    Clarity.set('error_status', String(error.status || ''));
    Clarity.upgrade('error_occurred');
  } catch (e) {
  }
};

export const useEffectAsync = (effect, deps) => {
  const dispatch = useDispatch();
  const ref = useRef();
  useEffect(() => {
    effect()
      .then((result) => ref.current = result)
      .catch((error) => {
        fireClarity(error);
        dispatch(errorsActions.push({ message: error.message, status: error.status }));
      });

    return () => {
      const result = ref.current;
      if (result) {
        result();
      }
    };
  }, [...deps, dispatch]);
};

export const useCatch = (method) => {
  const dispatch = useDispatch();
  return (...parameters) => {
    method(...parameters).catch((error) => {
      fireClarity(error);
      dispatch(errorsActions.push({ message: error.message, status: error.status }));
    });
  };
};

export const useCatchCallback = (method, deps) => {
  return useCallback(useCatch(method), deps);
};