const { body, validationResult } = require("express-validator");
var async = require('async');
var mongoose = require('mongoose');

var Book = require('../models/book');
var Genre = require('../models/genre');
const genre = require("../models/genre");
const e = require("express");
const { redirect } = require("express/lib/response");

// Display list of all Genre.
exports.genre_list = function (req, res) {

  Genre.find()
    .sort({ name: 'asc' })
    .exec(function (err, list_genres) {
      if (err) { return next(err) };
      // Successful, so rendern
      res.render(
        'genre/genre_list',
        {
          title: 'Genre List',
          genre_list: list_genres,
        }
      );
    });

};

// Display detail page for a specific Genre.
exports.genre_detail = function (req, res, next) {
  var id = mongoose.Types.ObjectId(req.params.id);

  async.parallel(
    {
      genre: function (callback) {
        Genre.findById(id)
          .exec(callback);
      },
      genre_books: function (callback) {
        Book.find({ 'genre': id })
          .exec(callback);
      },
    },
    function (err, results) {
      if (err) { return next(err); }
      if (results.genre == null) { // No results.
        var err = new Error('Genre not found');
        err.status = 404;
        return next(err);
      }
      // Successful, so render
      res.render(
        'genre/genre_detail',
        {
          title: 'Genre Detail',
          genre: results.genre,
          genre_books: results.genre_books,
        }
      )
    }
  )

};

// Display Genre create form on GET.
exports.genre_create_get = function (req, res) {

  res.render('genre/genre_form', { title: 'Create Genre' });

};

// Handle Genre create on POST.
exports.genre_create_post = [

  // Validate and sanitize
  body('name', 'Genre name required').trim().isLength({ min: 1 }).escape(),

  // Process request after validation and sanitization.
  (req, res, next) => {

    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a genre object with escaped and trimmed data.
    var genre = new Genre(
      { name: req.body.name }
    );

    if (!errors.isEmpty()) {
      // There are errors. Render the form again with sanitized values/error messages.
      res.render(
        'genre/genre_form',
        {
          title: 'Create Genre',
          genre: genre,
          errors: errors.array(),
        }
      );
      return;
    }
    else {
      // Data from form is valid.
      // Check if Genre with same name already exists.
      Genre.findOne({ 'name': req.body.name })
        .exec(function (err, found_genre) {
          if (err) { return next(err); }

          if (found_genre) {
            // Genre exits, redirect to its detail page.
            res.redirect(found_genre.url);
          }
          else {
            genre.save(function (err) {
              if (err) { return next(err); }
              // Genre saved. Redirect to genre detail page.
              res.redirect(genre.url);
            })
          }
        });
    }
  },
];

// Display Genre delete form on GET.
exports.genre_delete_get = function (req, res) {

  async.parallel(
    {
      genre: function (callback) {
        genre.findById(req.params.id).exec(callback);
      },
      genres_books: function (callback) {
        Book.find({ 'genre': req.params.id }).exec(callback);
      }
    },
    function (err, results) {
      if (err) { return next(err); }
      if (results.genre == null) { // No result.
        res.redirect('catalog/genres');
      }
      // Successful, so render.
      res.render('genre/genre_delete', {
        title: 'Delete Genre',
        genre: results.genre,
        genre_books: results.genres_books,
      })
    }
  )

};

// Handle Genre delete on POST.
exports.genre_delete_post = function (req, res) {

  async.parallel(
    {
      genre: function (callback) {
        genre.findById(req.params.id).exec(callback);
      },
      genres_books: function (callback) {
        Book.find({ 'genre': req.params.id }).exec(callback);
      }
    },
    function (err, results) {
      if (err) { return next(err); }
      // Success
      if (results.genres_books.length > 0) {
        // Some books include this genre. Render in same way sa for GET route. 
        res.render('genre/genre_delete', {
          title: 'Delete Genre',
          genre: results.genre,
          genre_books: results.genres_books,
        });
        return;
      }
      else {
        // No books include this genre. Delete object and redirect the list of genre.
        Genre.findByIdAndRemove(req.body.genreid, function deleteGenre(err) {
          if (err) { return next(err); }
          // Success - go to genre list
          res.redirect('/catalog/genres');
        });
      }
    }
  );

};

// Display Genre update form on GET.
exports.genre_update_get = function (req, res) {

  Genre.findById(req.params.id, function (err, genre) {
      if (err) { return next(err); }
      if (genre == null) { // No results.
        var err = new Error('Genre not found');
        err.status = 404;
        return next(err);
      }
      // Success, so render
      res.render(
          'genre/genre_form', 
          {
            title: 'Update Render',
            genre: genre
          }
      );
    });

};

// Handle Genre update on POST.
exports.genre_update_post = [

  body('name', 'Genre name must contain at least 3 characters').trim().isLength({ min: 3 }).escape(),

  // Process request after validation and sanitization.
  (req, res, next) => {

    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a genre object with escaped/trimmed data and old id.
    var genre = new Genre(
      {
        name: req.body.name,
        _id: req.params.id, // This is required, or a new ID will be assigned
      }
    );

    if (!errors.isEmpty()) {
      res.render(
        'genre/genre_form',
        {
          title: 'Update Genre',
          genre: genre,
          errors: errors.array(),
        }
      );
      return;
    } else {
      Genre.findByIdAndUpdate(req.params.id, genre, {}, function (err, thegenre) {
        if (err) { return next(err); }
				// Successful - redirect to genre detail page.
				res.redirect(thegenre.url);
      })
    }

  }

];
