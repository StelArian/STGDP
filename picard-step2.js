const util = require('util');
const async = require('async');
const fs = require('fs');

let load = {
	file_fb: './picard.json',
	episodes: {},
	members_unshorted: {},
	members_shorted: {},
	cvs_mem_eps: 'Επεισόδιο'
};

async.waterfall([
	function(callback_waterfall){
		fs.readFile(load.file_fb, 'utf-8', function(error, content) {
			if (error)
				return callback_waterfall(error);
			load.episodes = JSON.parse(content).episodes;
			// console.log(util.inspect(load.episodes, false, null, true));
			callback_waterfall();
		});
	},
	function(callback_waterfall){
		for (let ep_num in load.episodes) {
			for (let rate in load.episodes[ep_num].rates) {
				load.episodes[ep_num].rates[rate].voters.map(voter => {
					let name = voter[1].split(' ');
					let key = name[0] + ' ' + name[1].charAt(0) + '.#' + voter[0];
					if (undefined === load.members_unshorted[key])
						load.members_unshorted[key] = {
							id: voter[0],
							name: voter[1],
							rates: {}
						};
					load.members_unshorted[key].rates[ep_num] = rate;
				});
			}
		}

		Object.keys(load.members_unshorted).sort().forEach(function(member) {
			load.members_shorted[member] = load.members_unshorted[member];
			let rates = load.members_shorted[member].rates;
			let rates_sum = 0;
			for (let ep in rates) {
				let rate = rates[ep] + '';
				rates_sum += Number(rate.slice(0, 1) + '.' + rate.slice(1));
			}
			load.members_shorted[member].count = Object.keys(rates).length;
			let rate_average = rates_sum / load.members_shorted[member].count;
			load.members_shorted[member].average = Math.round(rate_average * 100) / 100;
		});

		for (let ep in load.episodes) {
			let episode = load.episodes[ep];
			let rate_average = episode.total / episode.count
			episode.average = Math.round(rate_average * 100) / 100;
			episode.title += ' (' + episode.average + '/' + episode.count + ')';
			// console.log(episode);
			for (let option in episode.rates)
				if (episode.rates[option].votes > episode.rates[option].voters.length)
					console.log(episode.title, option, episode.rates[option].votes);
		}

		let members = Object.keys(load.members_shorted);
		let memebrs_rates_sum = 0;
		let members_row = '';
		members.map(member => {
			let rates_len = Object.keys(load.members_shorted[member].rates).length;
			members_row += '\t' + member.split('#')[0] + ' (' + load.members_shorted[member].average + '/' + rates_len + ')';
			memebrs_rates_sum += load.members_shorted[member].average;
		});
		let memebrs_rates_average = memebrs_rates_sum / members.length;
		memebrs_rates_average = Math.round(memebrs_rates_average * 100) / 100
		load.cvs_mem_eps += '\tΜ.Ο. (' + memebrs_rates_average + ' από ' + members.length + ' μέλη)';
		load.cvs_mem_eps += members_row;

		let episodes = Object.keys(load.episodes);
		let episodes_rates_sum = 0;
		episodes.map(episode => {
			load.cvs_mem_eps += '\n' + load.episodes[episode].title;
			load.cvs_mem_eps += '\t' + load.episodes[episode].average;
			for (let member in load.members_shorted) {
				load.cvs_mem_eps += '\t';
				if (load.members_shorted[member].rates.hasOwnProperty(episode)) {
					let rate = load.members_shorted[member].rates[episode].toString();
					rate = Number(rate.slice(0, 1) + '.' + rate.slice(1));
					load.cvs_mem_eps += rate;
				}
			}
			episodes_rates_sum += load.episodes[episode].average;
		});

		fs.writeFile('./picard.csv', load.cvs_mem_eps, function(error) {
			if(error)
				return callback_waterfall(error);
			// console.log(load.cvs_mem_eps);
			callback_waterfall();
		});
	},
	], 
	function(error){
		if (error)
			console.log (error);
	}
);
