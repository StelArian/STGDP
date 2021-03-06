const util = require('util');
const async = require('async');
const fs = require('fs');

function eval_rate(question) {
	if (question.includes('1-'))
		return "050";
	if (question.includes('1 στα 5'))
		return "100";
	if (question.includes('2 στα 5'))
		return "200";
	if (question.includes('3 στα 5'))
		return "300";
	if (question.includes('3.5 στα 5'))
		return "350";
	if (question.includes('4 στα 5'))
		return "400";
	if (question.includes('4.25 στα 5'))
		return "425";
	if (question.includes('4.5 στα 5'))
		return "450";
	if (question.includes('4.75 στα 5'))
		return "475";
	if (question.includes('5 στα 5'))
		return "500";
	if (question.includes('5+'))
		return "550";
	return false;
}

let load = {
	titles: {
		101: 'Remembrance',
		102: 'Maps',
		103: 'End',
		104: 'Candor',
		105: 'City',
		106: 's1:e6',
		107: 's1:e7',
		108: 's1:e8',
        109: 's1:e9',
        110: 's1:e10',
	},
	dir_fb: './picard-polls-fb/',
	inject_file: './picard-polls-inject.json',
	episodes: {},
	fb2json_good: true
};

async.waterfall([
	function(callback_waterfall){
		fs.readFile(load.inject_file, 'utf-8', function(error, content) {
			if (error)
				return callback_each(error);
			load.inject = JSON.parse(content);
			// console.log(util.inspect(load.inject, false, null, true));
			callback_waterfall();
		});
	},
	function(callback_waterfall){
		fs.readdir(load.dir_fb, function(error, filenames) {
			if (error)
				return callback_waterfall(error);
			async.eachSeries(filenames, 
				function(filename, callback_each){
					fs.readFile(load.dir_fb + filename, 'utf-8', function(error, content) {
						if (error)
							return callback_each(error);
						let content_json = JSON.parse(content);
						let ep_num = filename.split('.')[0];
						let options = content_json.data.question.options.edges;
						load.episodes[ep_num] = {
							title: load.titles[ep_num],
							rates: {},
							average: 0,
							count: 0,
							total: 0
						};
						options.map(option => {
							let rate = eval_rate(option.node.text_with_entities.text);
							if (false !== rate) {
								load.episodes[ep_num].rates[rate] = {
									votes: option.node.profile_voters.count,
									voters: []
								};
								load.episodes[ep_num].count += option.node.profile_voters.count;
								load.episodes[ep_num].total += Number(rate.slice(0, 1) + '.' + rate.slice(1)) * option.node.profile_voters.count;
								option.node.profile_voters.edges.map((voter) => {
									load.episodes[ep_num].rates[rate].voters.push([
										voter.node.id,
										voter.node.name
									]);
									let name = voter.node.name.split(' ');
									let key = name[0] + ' ' + name[1].charAt(0) + '.#' + voter.node.id;
									// if(undefined === load.members_unshorted[key])
									// 	load.members_unshorted[key] = {
									// 		id: voter.node.id,
									// 		name: voter.node.name,
									// 		rates: {}
									// 	};
									// load.members_unshorted[key].rates[ep_num] = rate;
								});
								if (10 < option.node.profile_voters.count) {
									let missing_count = option.node.profile_voters.count - load.episodes[ep_num].rates[rate].voters.length
									console.log(ep_num, rate, 'need injection, misssing', missing_count);
									if (undefined !== load.inject[ep_num] && undefined !== load.inject[ep_num][rate]) {
										console.log(ep_num, rate, 'injecting...', JSON.stringify(load.inject[ep_num][rate]));
										load.episodes[ep_num].rates[rate].voters = [...load.episodes[ep_num].rates[rate].voters, ...load.inject[ep_num][rate]];
									} else {
										// console.log(load.episodes[ep_num].rates[rate].voters);
										console.log(ep_num, rate, 'no inject data');
									}
									if (option.node.profile_voters.count === load.episodes[ep_num].rates[rate].voters.length)
										console.log(ep_num, rate, 'good, done.');
									else {
										load.fb2json_good = false;
										console.log(ep_num, rate, 'crap!', load.episodes[ep_num].rates[rate].voters.length);
										console.log(load.episodes[ep_num].rates[rate].voters);
										console.log('you need to update picard-polls-inject.json manually');
									}
								}
							}
							else {
								// console.log(option.node.text_with_entities.text);
							}
						});
						callback_each();
					});
				},
				function(error){
					if(error)
						return console.log(error);

					// console.log(util.inspect(load, false, null, true));
					// console.log(util.inspect(load.members_shorted, false, null, true));

					delete load.titles;
					delete load.dir_fb;
					delete load.inject_file;
					delete load.inject;

					fs.writeFile('./picard.json', JSON.stringify(load, null, "\t"), function(error) {
						if(error)
							return callback_waterfall(error);
						callback_waterfall();
					});
				}
			);
		});
	},
	], 
	function(error){
		if(error)
			console.log(error);
		console.log('the end');
	});
