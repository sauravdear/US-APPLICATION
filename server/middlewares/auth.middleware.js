const jwt =require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "AbesEngineeringCollege";
//Jwt verification
 exports.protect = (req, res , next)=>{
    const token = req.headers.authorization?.split(" ")[1];//token nikala 
    if(!token) return res.status(401).json({message:"Access denied. No token provided"});
    //existence check

    try{
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    }catch(err){
        res.status(400).json({message: "Invalid token "});

    }
};


//restrict by role
exports.restrictTo = (...roles)=>{
    return (req, res, next) =>{
        if(!roles.includes(req.user.role))
            return res.status(403).json({message:"Permission denied"});
           next();
    };
};

