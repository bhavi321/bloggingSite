const AuthorModel = require("../models/authorModel");
const BlogModel = require("../models/blogModel");
const jwt=require("jsonwebtoken");
const blogModel = require("../models/blogModel");

const createBlog = async function (req, res) {
  try {
    let data = req.body
    let {title, body, authorId, tags, category, subcategory} = data
     
    //IF ANY FIELD IS NOT PRESENT IN THE REQ BODY------------------------------------------
    if(!title) return res.status(400).send({status : false,msg : "cannot create blog,title is required"})
    if(!body) return res.status(400).send({status : false,msg : "cannot create blog,body is required"})
    if(!authorId) return res.status(400).send({status : false,msg : "cannot create blog,authorId is required"})
    if(!tags) return res.status(400).send({status : false,msg : "cannot create blog,tags are required"})
    if(!category) return res.status(400).send({status : false,msg : "cannot create blog,category is required"})
    if(!subcategory) return res.status(400).send({status : false,msg : "cannot create blog,subcategory is required"})

    //LOOKING FOR THE AUTHOR ID IN COLLECTION--------------------------------------
    let authorData = await AuthorModel.findById(authorId);
    
    //IF AUTHOR ID IS NOT CORRECT-------------------------------
    if (!authorData)  return  res.status(400).send({ status: false, msg: "author does not exist" });

    //IF AUTHOR ID IS CORRECT THEN CREATING THE DOCUMENT------------------------------------
      const createdBlog = await BlogModel.create(data);
      return res.status(201).send({data:createdBlog});
  } 
  catch (err) {
     return res.status(500).send({ status: false, msg: err.message });
  }
};



const filterData = async function (req, res) {
  try {
    let query = req.query;
     
    //IF THERE IS NO QUERY GIVEN------------------------------------------------
    if (Object.keys(query).length == 0) {
      let getData = await BlogModel.find({isDeleted: false,isPublished: true,}).populate("authorId");

    //IF NO SUCH DOCUMENT IS FOUND--------------------------------------------
      if (getData.length==0)  return res.status(404).send("Documents not found"); 
      
    //IF DOCUMENT FOUND------------------------------------------------------------
      return res.status(200).send({data: getData});
    } 
    //IF THERE IS QUERY GIVEN-------------------------------------------------------
    else {
      let findData = await BlogModel.find({ ...query }).populate("authorId");
      
    //IF NO DOCUMENT WITH GIVEN QUERY FOUND------------------------------------------------
      if (findData.length == 0) return res.status(404).send({ msg: "Data not found" });
     
   //IF DOCUMENT MATCHING THE GIVEN QUERY FOUND-------------------------------------------------
      return res.status(200).send({ data: findData });
    }
  }
   catch (err) {
    return res.status(500).send({ status: false, error: err.message });
  }
};



const upddateblog = async function (req, res) {
  try {
    //LOOKING FOR THE REQUIRED BLOG IN COLLECTION------------------------------
    let blogsdata = await BlogModel.findOne({_id: req.params["blogId"], isDeleted: false});

    //IF THE BLOG IS NOT PRESENT-------------------------------------------------
    if (!blogsdata)
    return res.status(404).send("no documents found with this id");

    //AUTHORIZATION----------------------------------------------------------------
    if (blogsdata.authorId!=req.decodedToken.authorId) return res.status(400).send({status:false,msg:"You're not authorized to do this action"})
    
    //IF AUTHORIZATION SUCCESSFUL --------------------------------------------------
    let data = req.body;
    let todaysDate= new Date().toLocaleString()
    let updates = await BlogModel.findOneAndUpdate(
      { _id: req.params["blogId"] },
      {  body: data["body"], $push: {tags: data["tags"]}, isPublished: true, $set: { publishedAt: todaysDate }  },
      { new: true }
    );
    return res.status(200).send({ data: updates });
  } 
  catch (error) {
      return res.status(500).send({status: false, msg : error.message});
  }
};


const deleteBlog = async function (req, res) {
  try {
    let blogId= req.params.blogId;
    let data= await  BlogModel.findById(blogId)
    if(!data) return res.status(404).send({status:false,msg:"no documents found with this id"})

  //AUTHORIZATION----------------------------------------------------
  if (data.authorId!=req.decodedToken.authorId) return res.status(400).send({status:false,msg:"You're not authorized to do this action"})
  
   //IF AUTHORIZATION SUCCESSFUL--------------------------------------
    let todaysDate= new Date().toLocaleString()
    const blogData = await BlogModel.findOneAndUpdate(
      { _id: blogId,isDeleted:false },
      { $set: { isDeleted: true , deletedAt: todaysDate,isPublished:false } },
      { new: true }
    );
    if (!blogData) return res.status(404).send({ status: false, msg: "blog cannot be deleted" });
   return  res.status(200).send();
  } catch (err) {
     return res.status(500).send({ status: false, msg: err.message });
  }
};



const deleteBlogByFilter = async function (req, res) {
  try {
    let query = req.query;
    //IF NO QUERY IS PROVIDED------------------------------------------------
    if (Object.keys(query).length === 0 ) return res.status(404).send({ status: false, msg: "invalid request" });

    //IF QUERY IS PRESENT THEN LOOKING FOR THE REQUIRED DOCUMENT ALONG WITH AUTHORIZATION--------------------
    let data=await blogModel.find({authorId:req.decodedToken.authorId,...query})
   
    //IF THE AUTHOR IS NOT VALID----------------------------------------------
      if(data.length==0) return res.status(400).send({status:false,msg:"You are not authorized to do this action"})

      // IF AUTHORIZATION SUCCESSFUL--------------------------------------------------
      let todaysDate= new Date().toLocaleString()
      const blogData = await BlogModel.updateMany(
      { ...query ,isDeleted:false},
      { $set: { isDeleted: true , deletedAt: todaysDate,isPublished:false} },
      { new: true }
    );
    if (!blogData) return res.status(404).send({ status: false, msg: "data cannot be deleted" });
   
   return  res.status(200).send();
  } 
  catch (err) {
   return res.status(500).send({ status: false, msg: err.message });
  }
};



const authorLogin=async function(req,res){
 try {
  let {email,password}=req.body

  //IF DATA IS NOT PROVIDED IN THE REQ BODY--------------------------------
  if(!email && !password) return res.status(400).send({status: false, msg :"please provide email and password to login"})

  //IF ONE OF THE FIELDS IS MISSING----------------------------------------------
  if (!email)  return res.status(400).send({status: false, msg :"email is required to login"})
  if (!password)  return res.status(400).send({status: false, msg :"password is required to login"})

  //IF DETAILS ARE POVIDED THEN CHECKING IF THE DETAILS ARE CORRECT OR NOT---------------------
  let authorData= await AuthorModel.findOne({email:email,password:password})

  //IF DETAILS NOT CORRECT-------------------------------------------------------
  if(!authorData) return res.status(404).send({status:false,msg:"Enter valid Details"})
  
  //IF DETAILS ARE CORRECT THEN CREATING THE TOKEN------------------------------------------------
  const token= jwt.sign({
  authorId:authorData._id.toString(),
  team: "4 members"
  },
  "project1group1"
  )
  
  return res.status(200).send({status:true,data:token})
  }catch(error){
return res.status(500).send({msg:error.message})

  }
}


module.exports.createBlog = createBlog;
module.exports.filterData = filterData;
module.exports.upddateblog = upddateblog;
module.exports.deleteBlog = deleteBlog;
module.exports.deleteBlogByFilter = deleteBlogByFilter;
module.exports.authorLogin=authorLogin
