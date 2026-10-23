import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import App from './App';
import InitialPreloader from './components/InitialPreloader';
ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><BrowserRouter><AuthProvider><InitialPreloader/><App/></AuthProvider></BrowserRouter></React.StrictMode>);
