var async = require('async');
const { body, validationResult } = require('express-validator');
var BookInstance = require('../models/bookinstance');
var Book = require('../models/book');

// Display list of all BookInstances.
exports.bookinstance_list = function (req, res, next) {

  BookInstance.find()
    .sort({ status: 'asc' })
    .populate({
      path: 'book',
      sort: { 'title': 1 },
    })
    .exec(function (err, list_bookinstances) {
      if (err) { return next(err) };
      // Successful, sort bookinstances by title
      list_bookinstances.sort(function compare(a, b) {
        let c = 0;
        if (a.status == b.status) {
          if (a.book.title > b.book.title) {
            c = 1;
          } else if (a.book.title < b.book.title) {
            c = -1;
          }
        }
        return c;
      });
      // So render
      res.render(
        'bookinstance/bookinstance_list',
        {
          title: 'Book Instance List',
          bookinstance_list: list_bookinstances,
        },
      );
    });

};

// Display detail page for a BookInstances.
exports.bookinstance_detail = function (req, res) {

  BookInstance.findById(req.params.id)
    .populate('book')
    .exec(function (err, bookinstance) {
      if (err) { return next(err); }
      if (bookinstance == null) { // No results.
        var err = new Error('Book copy not found');
        err.status = 404;
        return next(err);
      }
      // Successful, so render.
      res.render(
        'bookinstance/bookinstance_detail',
        {
          title: 'Copy: ' + bookinstance.book.title,
          bookinstance: bookinstance,
        }
      )
    }
    );

};

// Display BookInstances create form on GET.
exports.bookinstance_create_get = function (req, res) {

  Book.find({}, 'title')
    .exec(function (err, books) {
      if (err) { next(err); }
      //Successful, so render.
      res.render('bookinstance/bookinstance_form', {
        title: 'Create BookInstance',
        book_list: books,
      })
    })

};

// Handle BookInstances create on POST.
exports.bookinstance_create_post = [

  // Validate and sanitize fields.
  body('book', 'Book must be specified').trim().isLength({ min: 1 }).escape(),
  body('imprint', 'Imprint must be specified').trim().isLength({ min: 1 }).escape(),
  body('status').escape(),
  body('due_back', 'Invalid date').optional({ checkFalsy: true }).isISO8601().toDate(),

  // Process request after validation and sanitazation.
  (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a BookInstance object with escaped and trimmed data.
    var bookinstance = new BookInstance({
      book: req.body.book,
      imprint: req.body.imprint,
      status: req.body.status,
      due_back: req.body.due_back,
    });

    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized value.
      Book.find({}, 'title')
        .exec(function (err, books) {
          if (err) { return next(err); }
          // Successful, so render.
          res.render(
            'bookinstance/bookinstance_form',
            {
              title: 'Create BookInstance',
              book_list: books,
              bookinstance: bookinstance,
              errors: errors.array(),
            }
          );
          return;
        })
    } else {
      // Data from form is valid.
      bookinstance.save(function (err) {
        if (err) { return next(err); }
        // Successful - redirect to new record.
        res.redirect(bookinstance.url);
      });
    }
  }

];

// Display BookInstances delete form on GET.
exports.bookinstance_delete_get = function (req, res, next) {

  BookInstance.findById(req.params.id)
    .populate('book')
    .exec(function (err, bookinstance) {
      if (err) { return next(err); }
      if (bookinstance == null) { // No results.
        res.redirect('catalog/bookinstances');
      }
      // Successful, so render.
      res.render('bookinstance/bookinstance_delete', {
        title: 'Delete Book Instance',
        bookinstance: bookinstance,
      });
    })

};

// Handle BookInstances delete on POST.
exports.bookinstance_delete_post = function (req, res) {

  BookInstance.findById(req.body.bookinstanceid)
    .populate('book')
    .exec(function (err, bookinstance) {
      if (err) { return next(err); }
      // Success 
      BookInstance.findByIdAndRemove(
        req.body.bookinstance,
        function deleteBookInstance(err) {
          if (err) { return next(err); }
          // Success - go to bookinstances list
          res.redirect('/catalog/bookinstances');
        }
      );
    });

};

// Display BookInstances update form on GET.
exports.bookinstance_update_get = function (req, res, next) {

  async.parallel(
    {
      bookinstance: function (callback) {
        BookInstance.findById(req.params.id).populate('book').exec(callback);
      },
      books: function (callback) {
        Book.find(callback);
      }
    },
    function (err, results) {
      if (err) { return next(err); }
      if (results.bookinstance == null) { // No results.
        var err = new Error('BookInstance not found');
        err.status = 404;
        return next(err);
      }
      res.render('bookinstance/bookinstance_form', {
        title: 'Update Book Instance',
        bookinstance: results.bookinstance,
        book_list: results.books,
      })
    }
  )

};

// Handle BookInstances update on POST.
exports.bookinstance_update_post = [

  // Validate and sanitize fields.
  body('book', 'Book must be specified').trim().isLength({ min: 1 }).escape(),
  body('imprint', 'Imprint must be specified').trim().isLength({ min: 1 }).escape(),
  body('status').escape(),
  body('due_back', 'Invalid date').optional({ checkFalsy: true }).isISO8601().toDate(),

  // Process request after validation and sanitization.
  (req, res, next) => {

    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a bookinstance object with escaped/trimmed data and old id.
    var bookinstance = new BookInstance(
      {
        book: req.body.book,
        imprint: req.body.imprint,
        status: req.body.status,
        due_back: req.body.due_back,
        _id: req.params.id // This is required, or a new ID will be assigned!
      }
    );

    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized value/error messages.

      // Get all books for form
      Book.find(function (err, books) {
        if (err) { return next(err); }

        res.render(
          'bookinstance/bookinstance_form',
          {
            title: 'Update Book Instance',
            books: books,
            bookinstance: bookinstance,
            errors: errors.array(),
          }
        );
      })
    } else {
      BookInstance.findByIdAndUpdate(req.params.id, bookinstance, {}, function(err, thebookinstance) {
        if (err) { return next(err); }
        // Success, so redirect to list of book instances
        res.redirect(thebookinstance.url)
      })
    }
  }

];