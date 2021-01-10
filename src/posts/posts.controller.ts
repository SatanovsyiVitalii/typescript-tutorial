import * as express from 'express';
import Post from './post.interface';
import Controller from '../interfaces/controller.interface';
import { postModel } from './posts.model';
import RequestWithUser from '../interfaces/requestWithUser.interface';
import PostNotFoundException from '../exceptions/PostNotFoundException';
import validationMiddleware from '../middleware/validation.middleware';
import CreatePostDto from './post.dto';
import authMiddleware from '../middleware/auth.middleware';

class PostsController implements Controller {
  public path = '/posts';
  public router = express.Router();
  private post = postModel;

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(this.path, this.getAllPosts);
    this.router.get(`${this.path}/:id`, this.getPostById);

    this.router
      .all(`${this.path}/*`, authMiddleware)
      .patch(`${this.path}/:id`, validationMiddleware(CreatePostDto), this.modifyPost)
      .post(this.path, validationMiddleware(CreatePostDto), this.createPost)
      .delete(`${this.path}/:id`, this.deletePost);
  }

  private getAllPosts = async (request: express.Request, response: express.Response) => {
    const posts = await this.post.find().populate('author', '-password');
    response.send(posts);
  }

  private createPost = async (request: RequestWithUser, response: express.Response) => {
    const postData: CreatePostDto = request.body;
    const createdPost = new this.post({
      ...postData,
      author: request.user._id,
    });
    const savedPost = await createdPost.save();
    await savedPost.populate('author', 'name').execPopulate();
    response.send(savedPost);
  }

  private getPostById = (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const id = request.params.id;
    this.post.findById(id)
      .then((post) => {
        response.send(post);
      }).catch((error) => {
        next(new PostNotFoundException(id));
      });
  }

  private modifyPost = (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const id = request.params.id;
    const postData: Post = request.body;
    this.post.findByIdAndUpdate(id, postData, { new: true })
      .then((post) => {
        response.send(post);
      })
      .catch(() => {
        next(new PostNotFoundException(id));
      });
  }

  private deletePost = (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const id = request.params.id;
    this.post.findByIdAndDelete(id)
      .then((successResponse) => {
        if (successResponse) {
          response.send(200);
        }
      })
      .catch(() => {
        next(new PostNotFoundException(id));
      });
  }
}

export default PostsController;
