const app = require('./app');
const userModel= require('./models/userModel');

const PORT = process.env.PORT || 5000;

// userModel.createUserTable()

app.listen(PORT, () => console.log(`Server running on ${process.env.NODE_ENV} port ${PORT}`));
