const AuthorModel = require("../models/authorModel");
const BlogModel = require("../models/blogModel");
const { isValidObjectId } = require('mongoose')

const createBlog = async function (req, res) {
  try {
    let data = req.body
 // IF NO DATA IS PRESENT IN BODY
    if(Object.keys(data).length===0) return res.status(400).send({status:false,msg:"put some data to update"})

    let {title, body, authorId, tags, category, subcategory} = data
   
 title=title.trim()
 body=body.trim()
    //IF ANY FIELD IS NOT PRESENT IN THE REQ BODY------------------------------------------
  
    if(!title ) return res.status(400).send({status : false,msg : "cannot create blog,title is required"})

    if(!body) return res.status(400).send({status : false,msg : "cannot create blog,body is required"})

    if(!authorId) return res.status(400).send({status : false,msg : "cannot create blog,authorId is required"})

    if(!tags) return res.status(400).send({status : false,msg : "cannot create blog,tags are required"})

    if(!category) return res.status(400).send({status : false,msg : "cannot create blog,category is required"})

    if(!subcategory) return res.status(400).send({status : false,msg : "cannot create blog,subcategory is required"})

    //LOOKING FOR THE AUTHOR ID IN COLLECTION--------------------------------------
    let authorData = await AuthorModel.findById(authorId);
    
    //IF AUTHOR ID IS NOT CORRECT-------------------------------
    if (!authorData)  return  res.status(400).send({ status: false, msg: "author does not exist with this Id" });
    //IF AUTHOR ID IS CORRECT THEN CREATING THE DOCUMENT------------------------------------
    if (!isValidObjectId(data.authorId))
    return res.status(400).send({ status: false, message: "Enter Valid AuthorId" })
const createdBlog = await BlogModel.create(data)
res.status(201).send({ status: true, message: "Blog Created Successfully", data: createdBlog })

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
      let getData = await BlogModel.find({isDeleted: false,isPublished: true}).populate("authorId");

    //IF NO SUCH DOCUMENT IS FOUND--------------------------------------------
      if (getData.length==0)  return res.status(404).send("Documents not found"); 
      
    //IF DOCUMENT FOUND------------------------------------------------------------
      return res.status(200).send({data: getData});
    } 


    //IF THERE IS QUERY GIVEN-------------------------------------------------------
    else {
      let findData = await BlogModel.find({ ...query,isDeleted: false,isPublished: true}).populate("authorId");
      
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

     let blogId=req.params.blogId
     if (!isValidObjectId(blogId)) return res.status(400).send({ status: false, message: "Enter Valid BlogId" })
    //LOOKING FOR THE REQUIRED BLOG IN COLLECTION------------------------------
    let blogsdata = await BlogModel.findOne({_id: req.params["blogId"], isDeleted: false});

    //IF THE BLOG IS NOT PRESENT-------------------------------------------------
    if (!blogsdata)
    return res.status(404).send("no documents found with this id");

    //AUTHORIZATION----------------------------------------------------------------
    if (blogsdata.authorId!=req.decodedToken.authorId) return res.status(400).send({status:false,msg:"You're not authorized to do this action"})
    
    //IF AUTHORIZATION SUCCESSFUL --------------------------------------------------
    let data = req.body;
     // IF NO DATA IS PRESENT IN BODY
    if(Object.keys(data).length===0) return res.status(400).send({status:false,msg:"put some data to update"})


    let todaysDate= new Date().toLocaleString()
    let updates = await BlogModel.findOneAndUpdate(
      { _id: req.params["blogId"] },
      {  body: data["body"],title:data["title"],$push: {tags: data["tags"]},$push: {category: data["category"]}, $push: {subcategory: data["subcategory"]}, isPublished: true, $set: { publishedAt: todaysDate }  },
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
      { $set: { isDeleted: true, deletedAt: todaysDate,isPublished:false } },
      { new: true }
    );

    //IF ALREADY DELETED,THEN BLOG CANNOT BE DELETED
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
    let data=await BlogModel.find({authorId:req.decodedToken.authorId,...query})
   
    if(data.length==0) return res.status(400).send({status:false,msg:"Blog not found"})
   
    let author=data[0].authorId
    if(author){
      let todaysDate= new Date().toLocaleString()
      const blogData = await BlogModel.updateMany(
      { ...query,  authorId: req.decodedToken.authorId ,isDeleted:false},
      { $set: { isDeleted: true , deletedAt: todaysDate,isPublished:false} },
      { new: true }
    );
    
    if (blogData.modifiedCount === 0) return res.status(400).send({ status: false, message: "No blog to be deleted" });
    else return res.status(200).send({ status: true, data: `${blogData.modifiedCount} blog deleted` });
    
      }else return res.status(400).send({ status: false, message: "You are not authorized to do this action" });
  
  } 
  catch (err) {
   return res.status(500).send({ status: false, msg: err.message });
  }
};






module.exports.createBlog = createBlog;
module.exports.filterData = filterData;
module.exports.upddateblog = upddateblog;
module.exports.deleteBlog = deleteBlog;
module.exports.deleteBlogByFilter = deleteBlogByFilter;


