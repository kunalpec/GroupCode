import { configureStore} from "@reduxjs/toolkit";
import authReducer from "../feature/Auth/AuthSlice.js";


// make the store and register the reducers ok 
const store=configureStore({
  reducer:{
    auth:authReducer
  }
});