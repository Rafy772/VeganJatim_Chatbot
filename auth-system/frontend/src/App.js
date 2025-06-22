import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Link, Routes, Navigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';
import debounce from 'lodash.debounce';
import Consultation from './Consultation';

axios.defaults.baseURL = 'http://localhost:5000';

// Components
const Register = () => {
  const [formData, setFormData] = useState({ 
    username: '', 
    email: '', 
    password: '' 
  });
  const [error, setError] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);

  // Debounced username check
  const checkUsername = debounce(async (username) => {
    if (username.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    
    setIsCheckingUsername(true);
    try {
      const res = await axios.post('/check-username', { username });
      setUsernameAvailable(res.data.available);
    } catch (error) {
      setUsernameAvailable(null);
    }
    setIsCheckingUsername(false);
  }, 500);

  useEffect(() => {
    return () => {
      checkUsername.cancel();
    };
  }, [checkUsername]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Client-side validation
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    
    if (usernameAvailable === false) {
      setError('Username is already taken');
      return;
    }

    try {
      await axios.post('/register', formData);
      alert('Registration successful! Please login.');
      window.location.href = '/login';
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Registration failed';
      setError(errorMessage);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Create Account</h2>
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Username</label>
            <input 
              type="text" 
              required
              minLength="3"
              value={formData.username}
              onChange={e => {
                setFormData({...formData, username: e.target.value});
                checkUsername(e.target.value);
              }}
            />
            <div className="username-feedback">
              {isCheckingUsername ? (
                <span className="checking">Checking availability...</span>
              ) : usernameAvailable !== null && (
                <span className={`availability ${usernameAvailable ? 'available' : 'taken'}`}>
                  {usernameAvailable ? 'Username available' : 'Username taken'}
                </span>
              )}
            </div>
          </div>

          <div className="input-group">
            <label>Email</label>
            <input 
              type="email" 
              required
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div className="input-group">
            <label>Password</label>
            <input 
              type="password" 
              required
              minLength="8"
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
            />
          </div>

          <button 
            type="submit" 
            disabled={isCheckingUsername || usernameAvailable === false}
          >
            Sign Up
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <a href="/login">Login here</a>
        </div>
      </div>
    </div>
  );
};

const OrderSuccess = () => {
  return (
    <div className="dashboard-container">
      <div className="dashboard-card">
        <div className="order-success">
          <h1>🎉 Order Processed Successfully!</h1>
          <p>Thank you for your order. Your delicious meal is being prepared.</p>
          <div className="success-actions">
            <Link to="/dashboard" className="back-btn">
              Back to Menu
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

const Login = ({ setAuth }) => {
  const [formData, setFormData] = useState({ username: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/login', formData);
      localStorage.setItem('token', res.data.token);
	  setAuth(true)
    } catch (error) {
      alert(error.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Welcome Back</h2>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Username</label>
            <input 
              type="text" 
              onChange={e => setFormData({...formData, username: e.target.value})} 
            />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input 
              type="password" 
              onChange={e => setFormData({...formData, password: e.target.value})} 
            />
          </div>
          <button type="submit">Sign In</button>
        </form>
      </div>
    </div>
  );
};

// Updated Dashboard component in App.js
const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState({}); // Cart state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const userRes = await axios.get('/dashboard', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUser(userRes.data);
        
        const menuRes = await axios.get('/menu', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMenuItems(menuRes.data);
        setLoading(false);
      } catch (error) {
        setError('Failed to load menu items');
        setLoading(false);
        console.error(error);
      }
    };
    
    fetchData();
  }, []);

  // Add item to cart
  const addToCart = (item) => {
    setCart(prevCart => ({
      ...prevCart,
      [item._id]: {
        ...item,
        quantity: (prevCart[item._id]?.quantity || 0) + 1
      }
    }));
  };

  // Remove item from cart
  const removeFromCart = (itemId) => {
    setCart(prevCart => {
      const newCart = { ...prevCart };
      if (newCart[itemId]) {
        if (newCart[itemId].quantity > 1) {
          newCart[itemId].quantity -= 0.5;
        } else {
          delete newCart[itemId];
        }
      }
      return newCart;
    });
  };

  // Get total items in cart
  const getTotalItems = () => {
    return Object.values(cart).reduce((total, item) => total + item.quantity, 0);
  };

  if (loading) return <div className="dashboard-container">Loading...</div>;
  if (error) return <div className="dashboard-container">{error}</div>;

  return (
    <div className="dashboard-container">
      <div className="dashboard-card">
        <h1>Welcome {user?.username}</h1>
        
		{/* Cart Display */}
		{getTotalItems() > 0 && (
		  <div className="cart-display">
			<h3>🛒 Cart ({getTotalItems()} items)</h3>

			<div className="cart-items">
			  {Object.values(cart).map(item => (
				<div key={item._id} className="cart-item">
				  <span>{item.name}</span>
				  <span className="cart-quantity">x{item.quantity}</span>
				  <span className="cart-price">
					${ (item.price * item.quantity).toFixed(2) }
				  </span>
				</div>
			  ))}
			</div>

			<div className="cart-total">
			  Total: $
			  {Object.values(cart)
				.reduce((total, item) => total + (item.price * item.quantity), 0)
				.toFixed(2)}

			  <div className="checkout-section">
				<Link to="/order-success" className="checkout-btn">
				  Checkout & Order Now
				</Link>
			  </div>
			</div>
		  </div>
		)}
        
        <div className="menu-section">
          <h2>Today's Menu</h2>
          <div className="menu-grid">
            {menuItems.map(item => (
              <div key={item._id} className="menu-item">
                <div className="item-image">
                  <img 
                    src={item.image} 
                    alt={item.name} 
                    onError={(e) => {
                      e.target.onerror = null; 
                      e.target.src = 'https://via.placeholder.com/300x200?text=No+Image';
                    }}
                  />
                </div>
                <div className="item-info">
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                  <div className="item-meta">
                    <div className="nutrition-info">
                      <span className="price">${item.price.toFixed(2)}</span>
                      <span className="calories">{item.calories} cal</span>
                    </div>
                    <span className={`category ${item.category}`}>
                      {item.category}
                    </span>
                  </div>
                  
                  {/* Cart Controls */}
                  <div className="cart-controls">
                    <button 
                      className="cart-btn add-btn"
                      onClick={() => addToCart(item)}
                    >
                      Add
                    </button>
                    {cart[item._id] && (
                      <>
                        <span className="item-quantity">{cart[item._id].quantity}</span>
                        <button 
                          className="cart-btn remove-btn"
                          onClick={() => removeFromCart(item._id)}
                        >
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>


        <div className="consultation-section">
          <Consultation 
            cart={cart} 
            setCart={setCart} 
            menuItems={menuItems}
          />
        </div>

		<button 
		  className="logout-btn"
		  onClick={handleLogout}
		>
		  Logout
		</button>
      </div>
    </div>
  );
};

const handleLogout = async () => {
  try {
    const token = localStorage.getItem('token');
    if (token) {
      await axios.post('/logout', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    }
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Always clear token and redirect, even if API call fails
    localStorage.removeItem('token');
    window.location.href = '/login';
  }
};

const App = () => {
  const [isAuth, setAuth] = useState(false);

  return (
    <Router>
      <nav>
        <div className="container">
          <Link to="/">Home</Link>
          {!isAuth && <Link to="/register">Register</Link>}
          {!isAuth && <Link to="/login">Login</Link>}
        </div>
      </nav>
      <div className="container">
		<Routes>
		  <Route path="/" element={<Navigate to="/dashboard" />} />
		  <Route path="/register" element={<Register />} />
		  <Route path="/login" element={
			localStorage.getItem('token') ? <Navigate to="/dashboard" /> : <Login setAuth={setAuth} />
		  } />
		  <Route path="/dashboard" element={
			localStorage.getItem('token') ? <Dashboard /> : <Navigate to="/login" />
		  } />
		  <Route path="/order-success" element={
			localStorage.getItem('token') ? <OrderSuccess /> : <Navigate to="/login" />
		  } />
		</Routes>
      </div>
    </Router>
  );
};

export default App;