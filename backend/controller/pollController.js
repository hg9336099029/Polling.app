const express = require('express');
const Poll = require('../models/poll');
const User = require('../models/user');

// Create poll
const createPoll = async (req, res) => {
    try {
        const { question, pollType, options } = req.body;

        // Validate required fields
        if (!question || !pollType) {
            return res.status(400).json({ message: 'Question and Poll Type are required' });
        }

        // Process images
        const images = req.files ? req.files.map(file => {
            if (file.size > 2 * 1024 * 1024) {
                throw new Error('One or more files exceed 2MB size limit');
            }
            return `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
        }) : [];

        // Parse options safely
        const parsedOptions = options ? JSON.parse(options) : [];

        const newPoll = new Poll({
            question,
            pollType,
            options: parsedOptions.map(option => ({ text: option, votes: 0 })),
            images,
            createdBy: req.user._id // Associate poll with the user
        });

        await newPoll.save();
        res.status(201).json({ message: 'Poll created successfully', poll: newPoll });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get all polls
const getAllPolls = async (req, res) => {
    try {
        const polls = await Poll.find()
            .populate('createdBy', 'username fullname')
            .sort({ createdAt: -1 })
            .lean();
        res.status(200).json({ polls });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get polls of a specific user
const getUserPolls = async (req, res) => {
    try {
        const polls = await Poll.find({ createdBy: req.user._id })
            .populate('createdBy', 'username fullname')
            .sort({ createdAt: -1 });
        res.status(200).json({ polls });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Delete poll of a specific user
const deletePoll = async (req, res) => {
    try {
        const poll = await Poll.findByIdAndDelete(req.params.id);
        if (!poll) {
            return res.status(404).json({ message: "Poll not found" });
        }
        res.status(200).json({ message: "Poll deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Vote on a poll
const voteOnPoll = async (req, res) => {
    try {
        const { pollId } = req.params;
        const { optionIndex } = req.body;

        const poll = await Poll.findById(pollId);
        if (!poll) {
            return res.status(404).json({ message: "Poll not found" });
        }

        if (poll.voters.includes(req.user._id)) {
            return res.status(400).json({ message: "You have already voted on this poll" });
        }

        // Validate the options array and the optionIndex
        if (!poll.options || !Array.isArray(poll.options) || !poll.options[optionIndex]) {
            return res.status(400).json({ message: "Invalid option selected" });
        }

        // Increment the vote count for the selected option
        poll.options[optionIndex].votes += 1;
        poll.voters.push(req.user._id);

        // Add poll ID to the user's votedPolls
        const user = await User.findById(req.user._id);
        user.votedPolls.push(poll._id);
        await user.save();

        await poll.save();

        res.status(200).json({ message: "Vote recorded successfully", poll });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// show voted polls by particular user

const getVotedPolls = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate({
            path: 'votedPolls',
            populate: { path: 'createdBy', select: 'username fullname' } // Populate poll creator details
        });
        // console.log(user.votedPolls);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({ votedPolls: user.votedPolls });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Bookmark a poll

const bookmarkpoll =async(req,res) =>{
    try{
        const {pollId} = req.params;
        const poll = await Poll.findById(pollId);
        if(!poll){
            return res.status(404).json({message:"Poll not found"});
        }

        // Check if the poll is already bookmarked
        const user = await User.findById(req.user._id);
        
        if(user.bookmarkedPolls.includes(pollId)){
            return res.status(400).json({message:"Poll already bookmarked"});
        }

        // Add poll ID to the user's bookmarkedPolls
        user.bookmarkedPolls.push(poll._id);
        await user.save();

        res.status(200).json({message:"Poll bookmarked successfully",poll});

    }
    catch(error){
        res.status(500).json({error:error.message});
    }
}

//show bookmarked polls by particular user

const getbookmarkedPolls = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate('bookmarkedPolls');
        res.status(200).json({ bookmarkedPolls: user.bookmarkedPolls });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};


module.exports = { createPoll, getAllPolls, getUserPolls, deletePoll, voteOnPoll, getVotedPolls,bookmarkpoll, getbookmarkedPolls };