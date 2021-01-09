const Token = artifacts.require("FEYToken");
const catchRevert = require("./exceptionsHelpers.js").catchRevert;

require("./utils");

const getLastEvent = async (eventName, instance) => {
    const events = await instance.getPastEvents(eventName, {
        fromBlock: 0,
        toBlock: "latest"
    });
    return events.pop().returnValues;
};

const totalSupplyDefault = web3.utils.toWei(
    '1000000000',
    'ether'
);

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

contract("Declaration", ([owner, user1, user2]) => {

    beforeEach(async () => {
        token = await Token.new();
    });

    it("should assign totalSupply to balances of msg.sender and no other user", async () => {

        const initBalancesMsgSender = await token.balances(owner);
        const initBalancesUser1 = await token.balances(user1);

        assert.equal(
            initBalancesMsgSender.toString(),
            totalSupplyDefault
        );
        assert.equal(
            initBalancesUser1.toString(),
            0
        );
    });

    it("should call incrementId on OpenStake", async () => {

        const expectedStakingId = 1;
        const stakeId = expectedStakingId - 1;
        const timeToAdvance = 30;

        const stakedAmount = web3.utils.toWei(
            '7000',
            'ether'
        );

        await token.openStake(
            stakedAmount
        );

        const globalsInfo = await token.globals();

        assert.equal(
            globalsInfo.stakingId,
            expectedStakingId
        );
    });

    it("should not increment stakingId with time", async () => {

        const expectedStakingId = 1;
        const stakeId = expectedStakingId - 1;
        const timeToAdvance = 30;

        const stakedAmount = web3.utils.toWei(
            '7000',
            'ether'
        );

        await token.openStake(
            stakedAmount
        );

        await advanceTimeAndBlock(
            parseInt(timeToAdvance.toString())
        );

        await advanceTimeAndBlock(
            parseInt(timeToAdvance.toString())
        );

        const globalsInfo = await token.globals();

        assert.equal(
            globalsInfo.stakingId,
            expectedStakingId
        );
    });

    it("should not decrement with closeStake", async () => {

        const expectedStakingId = 1;
        const timeToAdvance = 30;

        const stakedAmount = web3.utils.toWei(
            '7000',
            'ether'
        );

        await token.openStake(
            stakedAmount
        );

        const firstStakingID = await getLastEvent(
            "StakeStart",
            token
        );

        const stakeId = firstStakingID._stakingId;

        await advanceTimeAndBlock(
            parseInt(timeToAdvance.toString())
        );

        await token.closeStake(
            stakeId
        );

        const globalsInfo = await token.globals();

        assert.equal(
            globalsInfo.stakingId,
            expectedStakingId
        );
    });

    it("should get correct CONSTANTS values", async () => {

        const name = "FEYToken";
        const symbol = "FEY";

        const expectedYearlyInterest = 410;
        const expectedMinStake = 100E18;
        const expectedSecondsInDay = 30;

        const realName = await token.name();
        const realSymbol = await token.symbol();
        const realYearlyInterest = await token.YEARLY_INTEREST();
        const realMinStake = await token.MINIMUM_STAKE();
        const realSecondsInDay = await token.SECONDS_IN_DAY();

        assert.equal(
            name,
            realName
        );

        assert.equal(
            symbol,
            realSymbol
        );

        assert.equal(
            expectedYearlyInterest,
            realYearlyInterest
        );

        assert.equal(
            expectedMinStake,
            realMinStake
        );

        assert.equal(
            expectedSecondsInDay,
            realSecondsInDay
        );
    });


    it("should update global.totalStaked after opening stake", async () => {

        const timeToAdvance = await token.SECONDS_IN_DAY();
        const stakedAmount = web3.utils.toWei(
            '7000',
            'ether'
        );

        const globalsBefore = await token.globals();

        await token.openStake(
            stakedAmount
        );

        await advanceTimeAndBlock(
            parseInt(timeToAdvance.toString())
        );

        const globalsAfter = await token.globals();

        assert.equal(
            globalsBefore.totalStakedAmount.toString(),
            0
        );
        assert.equal(
            globalsAfter.totalStakedAmount.toString(),
            stakedAmount.toString()
        );
    });
});

contract("Timing", ([owner, user1]) => {

    beforeEach(async () => {
        token = await Token.new();
    });

    it("should increment feyday when block time exactly equals SECONDS_IN_DAY", async () => {

        const timeToAdvance = await token.SECONDS_IN_DAY();

        const initFeyDay = await token.currentFeyDay();
        const expectedFeyDay = 1;

        await advanceTimeAndBlock(
            parseInt(timeToAdvance.toString())
        );

        const newFeyDay = await token.currentFeyDay();

        assert.equal(
            initFeyDay,
            0
        );

        assert.equal(
            newFeyDay,
            expectedFeyDay
        );
    });

    it("should not increment FeyDay globals if advance block SECONDS_IN_DAY", async () => {

        const timeToAdvance = await token.SECONDS_IN_DAY();
        const initFeyDay = await token.currentFeyDay();

        await advanceTimeAndBlock(
            parseInt(timeToAdvance.toString())
        );

        const globals = await token.globals();

        assert.equal(
            initFeyDay,
            0
        );

        assert.equal(
            globals.currentFeyDay.toString(),
            initFeyDay.toString()
        );
    });

    it("should update currentFeyDay when snapshots are triggered", async () => {

        const initFeyDay = 0;
        const higherFeyDay = 1;
        const timeToAdvance = await token.SECONDS_IN_DAY();

        const stakedAmount = web3.utils.toWei(
            '7000',
            'ether'
        );

        const feyDayBeforeFirstOpen = await token.currentFeyDay();

        await token.openStake(
            stakedAmount
        );

        await advanceTimeAndBlock(
            parseInt(timeToAdvance.toString())
        );

        const feyDayAfterFirstOpen = await token.currentFeyDay();

        assert.equal(
            feyDayBeforeFirstOpen.toString(),
            initFeyDay
        );

        assert.equal(
            feyDayAfterFirstOpen.toString(),
            higherFeyDay
        );
    });

    it("should update currentFeyDay when snapshots are manually triggered", async () => {

        const initFeyDay = 0;
        const higherFeyDay = 1;
        const timeToAdvance = await token.SECONDS_IN_DAY();

        const feyDayBeforeManualSS = await token.currentFeyDay();

        await token.manualDailySnapshot({gas: 12000000});

        await advanceTimeAndBlock(
            parseInt(timeToAdvance.toString())
        );

        const feyDayAfterManualSS = await token.currentFeyDay();

        assert.equal(
            feyDayBeforeManualSS.toString(),
            initFeyDay
        );

        assert.equal(
            feyDayAfterManualSS.toString(),
            higherFeyDay
        );
    });
});

contract("Events", ([owner, user1,]) => {

    beforeEach(async () => {
        token = await Token.new();
    });

    it("should emit StakeStart event with correct data", async () => {

        const timeToAdvance = await token.SECONDS_IN_DAY();
        const stakedAmount = web3.utils.toWei(
            '7000',
            'ether'
        );

        await token.openStake(
            stakedAmount
        );

        const event = await getLastEvent(
            "StakeStart",
            token
        );

        await advanceTimeAndBlock(
            parseInt(timeToAdvance.toString())
        );

        assert.equal(
            event._stakingId.toString(),
            0
        );
        assert.equal(
            event._address.toString(),
            owner
        );
        assert.equal(
            event._amount.toString(),
            stakedAmount
        );
    });

    it("should emit StakeEnd event with correct data", async () => {

        const timeToAdvance = await token.SECONDS_IN_DAY();
        const stakedAmount = web3.utils.toWei(
            '7000',
            'ether'
        );
        const lessThanTwoDaysPenalty = .075;
        const amountAfterPenalty = stakedAmount * (1-lessThanTwoDaysPenalty);

        await token.openStake(
            stakedAmount
        );

        const firstStakingID = await getLastEvent(
            "StakeStart",
            token
        );

        const stakeId = firstStakingID._stakingId;

        await advanceTimeAndBlock(
            parseInt(timeToAdvance.toString())
        );

        await token.closeStake(
            stakeId
        );

        const closeStakeEvent = await getLastEvent(
            "StakeEnd",
            token
        );

        assert.equal(
            closeStakeEvent._stakingId.toString(),
            0
        );

        assert.equal(
            closeStakeEvent._address.toString(),
            owner
        );

        assert.equal(
            closeStakeEvent._amount.toString(),
            amountAfterPenalty
        );
    });


    it("should emit Transfer event with correct data", async () => {

        const timeToAdvance = await token.SECONDS_IN_DAY();
        const transferAmount = web3.utils.toWei(
            '7000',
            'ether'
        );

        const balanceAfter = totalSupplyDefault - transferAmount;

        await token.approve(
            owner,
            transferAmount,
            {from: owner}
        );

        await token.transfer(
            user1,
            transferAmount,
            {from: owner}
        );

        const transferEvent = await getLastEvent(
            "Transfer",
            token
        );

        await advanceTimeAndBlock(
            parseInt(timeToAdvance.toString())
        );

        const user1balancePostTransfer = await token.balanceOf(user1);
        const ownerbalancePostTransfer = await token.balanceOf(owner);

        assert.equal(
            ownerbalancePostTransfer.toString(),
            balanceAfter
        );

        assert.equal(
            user1balancePostTransfer.toString(),
            transferAmount
        );

        assert.equal(
            transferEvent._from.toString(),
            owner
        );

        assert.equal(
            transferEvent._to.toString(),
            user1
        );

        assert.equal(
            transferEvent._value.toString(),
            transferAmount
        );
    });

    it("should emit Approval event with correct data", async () => {

        const timeToAdvance = await token.SECONDS_IN_DAY();
        const transferAmount = web3.utils.toWei(
            '7000',
            'ether'
        );

        const balanceAfter = totalSupplyDefault - transferAmount;

        await token.approve(
            owner,
            transferAmount,
            {from: owner}
        );

        const approvalEvent = await getLastEvent(
            "Approval",
            token
        );

        await token.transfer(
            user1,
            transferAmount,
            {from: owner}
        );

        await advanceTimeAndBlock(
            parseInt(timeToAdvance.toString())
        );

        const user1balancePostTransfer = await token.balanceOf(user1);
        const ownerbalancePostTransfer = await token.balanceOf(owner);

        assert.equal(
            ownerbalancePostTransfer.toString(),
            balanceAfter
        );

        assert.equal(
            user1balancePostTransfer.toString(),
            transferAmount
        );

        assert.equal(
            approvalEvent._owner.toString(),
            owner
        );
        assert.equal(
            approvalEvent._spender.toString(),
            owner
        );
        assert.equal(
            approvalEvent._value.toString(),
            transferAmount
        );
    });


    it("should emit ClosedGhostStake event with correct data", async () => {

        const timeToAdvance = await token.SECONDS_IN_DAY();
        const maxSecondsOld = await token.SECONDS_IN_DAY();
        const maxStakeAge = await token.MAX_STAKE_DAYS();
        const maxTimeToAdvance = timeToAdvance * maxStakeAge;
        const initStakedAmount = web3.utils.toWei(
            '7000',
            'ether'
        );

        await token.openStake(
            initStakedAmount
        );

        const firstStakingID = await getLastEvent(
            "StakeStart",
            token
        );

        await advanceTimeAndBlock(
            parseInt(maxTimeToAdvance.toString()) + 30
        );

        const stakeAge = await token.getStakeAge(firstStakingID._stakingId);

        await token.closeGhostStake(
            firstStakingID._stakingId,
            { from: owner }
        );

        const closeGhostStakeEvent = await getLastEvent(
            "ClosedGhostStake",
            token
        );

        assert.equal(
            closeGhostStakeEvent.stakeId,
            firstStakingID._stakingId
        );

        assert.equal(
            closeGhostStakeEvent.daysOld,
            maxStakeAge
        );

        assert.equal(
            closeGhostStakeEvent.secondsOld,
            maxSecondsOld
        );
    });

    it("should emit SnapshotCaptured event with correct data", async () => {

        const timeToAdvance = await token.SECONDS_IN_DAY();
        const stakedAmount = web3.utils.toWei(
            '7000',
            'ether'
        );

        const globalsBefore = await token.globals();

        //first transaction
        await token.openStake(
            stakedAmount
        );

        const event = await getLastEvent(
            "SnapshotCaptured",
            token
        );

        await advanceTimeAndBlock(
            parseInt(timeToAdvance.toString())
        );

        assert.equal(
            event._totalStakedAmount,
            globalsBefore.totalStakedAmount.toString()
        );
    });
});

contract("FEYToken", ([owner, user1, user2]) => {

    describe("Initial Variables", () => {

        beforeEach(async () => {
            token = await Token.new();
        });

        it("should assign totalSupply to balances[] of msg.sender", async () => {
            const initBalances = await token.balanceOf(owner);

            assert.equal(
                initBalances.toString(),
                totalSupplyDefault
            );
        });

        it("should allow transfer by default", async () => {

            const tranferBalance = 1000;

            const user1balancebefore = await token.balances(user1);
            const ownerbalancebefore = await token.balances(owner);

            await token.transfer(user1, tranferBalance);
            const user1balanceAfter = await token.balances(user1);
            const ownerbalanceAfter = await token.balances(owner);

            assert.equal(
                user1balancebefore.toString(),
                0
            );

            assert.equal(
                ownerbalancebefore.toString(),
                totalSupplyDefault
            );

            assert.equal(
                user1balanceAfter.toString(),
                tranferBalance
            );

            assert.equal(
                ownerbalanceAfter.toString(),
                totalSupplyDefault - tranferBalance
            );
        });

        it("should be applying the allowances mechanism with Approve()", async () => {

            const timeToAdvance = await token.SECONDS_IN_DAY();
            const approvalAmount = 1000;

            const preAllowance = await token.allowance(owner, user1);

            const user1balancebefore = await token.balances(user1);
            const ownerbalancebefore = await token.balances(owner);

            await token.approve(
                user1,
                approvalAmount,
                {from: owner}
            );

            await advanceTimeAndBlock(
                parseInt(timeToAdvance.toString())
            );

            const postAllowance = await token.allowance(owner, user1);

            assert.equal(
                user1balancebefore.toString(),
                0
            );

            assert.equal(
                ownerbalancebefore.toString(),
                totalSupplyDefault
            );

            //allowances check
            assert.equal(
                preAllowance.toString(),
                0
            );
            assert.equal(
                postAllowance.toString(),
                approvalAmount
            );
        });
    });

    describe("Snapshot", () => {

        beforeEach(async () => {
            token = await Token.new();
        });

        it("should offload global.totalStaked into snapshot (once the day passes) with manualSnapShot", async () => {

            const timeToAdvance = await token.SECONDS_IN_DAY();
            const initFeyDay = await token.currentFeyDay();
            const stakedAmount = web3.utils.toWei(
                '7000',
                'ether'
            );

            const globalsBefore = await token.globals();

            //first transaction
            await token.openStake(
                stakedAmount
            );

            const event = await getLastEvent(
                "SnapshotCaptured",
                token
            );

            await advanceTimeAndBlock(
                parseInt(timeToAdvance.toString())
            );

            assert.equal(
                event._totalStakedAmount,
                globalsBefore.totalStakedAmount.toString()
            );

            //snapshot
            await token.manualDailySnapshot({gas: 12000000});

            const manualSnapshotevent = await getLastEvent(
                "SnapshotCaptured",
                token
            );

            assert.equal(
                manualSnapshotevent._totalStakedAmount,
                stakedAmount
            );

            const globalsAfter = await token.globals();

            const initSnapshot = await token.snapshots(initFeyDay);

            //checks snapshot of initFeyDay total staked amount
            assert.equal(
                initSnapshot.totalStakedAmount.toString(),
                stakedAmount
            );

            //check globals totalStaked was updated
            assert.equal(
                globalsBefore.totalStakedAmount.toString(),
                0
            );
            assert.equal(
                globalsAfter.totalStakedAmount.toString(),
                stakedAmount.toString()
            );
        });

        it("should offload global.totalStaked into snapshot (once the day passes) with second openStake", async () => {

            const timeToAdvance = await token.SECONDS_IN_DAY();
            const initFeyDay = await token.currentFeyDay();
            const stakedAmount = web3.utils.toWei(
                '7000',
                'ether'
            );
            const bothStakesAmount = web3.utils.toWei(
                '14000',
                'ether'
            );

            const globalsBefore = await token.globals();

            //first transaction
            await token.openStake(
                stakedAmount
            );

            const event = await getLastEvent(
                "SnapshotCaptured",
                token
            );

            await advanceTimeAndBlock(
                parseInt(timeToAdvance.toString())
            );

            assert.equal(
                event._totalStakedAmount,
                globalsBefore.totalStakedAmount.toString()
            );

            //second transaction
            await token.openStake(
                stakedAmount
            );

            const secondSnapShot = await getLastEvent(
                "SnapshotCaptured",
                token
            );

            await advanceTimeAndBlock(
                parseInt(timeToAdvance.toString())
            );

            const globalsAfter = await token.globals();
            const initSnapshot = await token.snapshots(initFeyDay);

            //checks snapshot of initFeyDay total staked amount
            assert.equal(
                secondSnapShot._totalStakedAmount,
                stakedAmount
            );

            assert.equal(
                initSnapshot.totalStakedAmount.toString(),
                secondSnapShot._totalStakedAmount
            );

            //check globals totalStaked was updated
            assert.equal(
                globalsBefore.totalStakedAmount.toString(),
                0
            );
            assert.equal(
                globalsAfter.totalStakedAmount.toString(),
                bothStakesAmount.toString()
            );
        });

        it("should capture all snapshots when many days between first and second stake", async () => {

            const timeToAdvance = await token.SECONDS_IN_DAY();
            const initFeyDay = await token.currentFeyDay();
            const feyDay2 = initFeyDay + 1;
            const feyDay3 = initFeyDay + 2;
            const feyDay4 = initFeyDay + 3;
            const feyDay5 = initFeyDay + 4;
            const initStakedAmount = web3.utils.toWei(
                '7000',
                'ether'
            );
            const bothStakesAmount = web3.utils.toWei(
                '14000',
                'ether'
            );

            const globalsBefore = await token.globals();

            //first transaction
            await token.openStake(
                initStakedAmount
            );

            const event = await getLastEvent(
                "SnapshotCaptured",
                token
            );

            assert.equal(
                event._totalStakedAmount,
                globalsBefore.totalStakedAmount.toString()
            );

            //5 days
            await advanceTimeAndBlock(
                parseInt(timeToAdvance.toString())
            );
            await advanceTimeAndBlock(
                parseInt(timeToAdvance.toString())
            );
            await advanceTimeAndBlock(
                parseInt(timeToAdvance.toString())
            );
            await advanceTimeAndBlock(
                parseInt(timeToAdvance.toString())
            );
            await advanceTimeAndBlock(
                parseInt(timeToAdvance.toString())
            );

            //second transaction
            await token.openStake(
                initStakedAmount
            );

            const secondSnapShot = await getLastEvent(
                "SnapshotCaptured",
                token
            );

            await advanceTimeAndBlock(
                parseInt(timeToAdvance.toString())
            );

            //take snapshot of current state for testing
            await token.manualDailySnapshot({gas: 12000000});

            const manualSnapshotevent = await getLastEvent(
                "SnapshotCaptured",
                token
            );

            const globalsAfter = await token.globals();
            const initSnapshot = await token.snapshots(initFeyDay);
            const day2Snapshot = await token.snapshots(feyDay2);
            const day3Snapshot = await token.snapshots(feyDay3);
            const day4Snapshot = await token.snapshots(feyDay4);
            const day5Snapshot = await token.snapshots(feyDay5);

            //checks snapshot of initFeyDay total staked amount
            assert.equal(
                secondSnapShot._totalStakedAmount,
                initStakedAmount
            );

            assert.equal(
                initSnapshot.totalStakedAmount.toString(),
                secondSnapShot._totalStakedAmount
            );

            //check days in between snapshots
            assert.equal(
                day2Snapshot.totalStakedAmount.toString(),
                initSnapshot.totalStakedAmount.toString()
            );

            assert.equal(
                day3Snapshot.totalStakedAmount.toString(),
                initSnapshot.totalStakedAmount.toString()
            );

            assert.equal(
                day4Snapshot.totalStakedAmount.toString(),
                initSnapshot.totalStakedAmount.toString()
            );

            assert.equal(
                day5Snapshot.totalStakedAmount.toString(),
                initSnapshot.totalStakedAmount.toString()
            );

            assert.equal(
                manualSnapshotevent._totalStakedAmount,
                bothStakesAmount
            );

            //check globals totalStaked was updated
            assert.equal(
                globalsBefore.totalStakedAmount.toString(),
                0
            );

            assert.equal(
                globalsAfter.totalStakedAmount.toString(),
                bothStakesAmount.toString()
            );
        });

        it("should store correct historical data in snapshot", async () => {

            const timeToAdvance = await token.SECONDS_IN_DAY();
            const initFeyDay = await token.currentFeyDay();

            const feyDay2 = initFeyDay + 1;
            const feyDay3 = initFeyDay + 2;

            const initStakedAmount = web3.utils.toWei(
                '7000',
                'ether'
            );
            const totalStakesAmount = web3.utils.toWei(
                '21000',
                'ether'
            );

            const globalsBefore = await token.globals();

            //1st transaction
            await token.openStake(
                initStakedAmount
            );

            const snapshotevent1 = await getLastEvent(
                "SnapshotCaptured",
                token
            );

            assert.equal(
                snapshotevent1._totalStakedAmount,
                globalsBefore.totalStakedAmount.toString()
            );

            await advanceTimeAndBlock(
                parseInt(timeToAdvance.toString())
            );

            //--------------------------------------
            //2nd transaction
            await token.openStake(
                initStakedAmount
            );

            const snapshotevent2 = await getLastEvent(
                "SnapshotCaptured",
                token
            );

            assert.equal(
                snapshotevent2._totalStakedAmount,
                initStakedAmount
            );

            await advanceTimeAndBlock(
                parseInt(timeToAdvance.toString())
            );

            //--------------------------------------
            //3rd transaction
            await token.openStake(
                initStakedAmount
            );

            const snapshotevent3 = await getLastEvent(
                "SnapshotCaptured",
                token
            );

            assert.equal(
                snapshotevent3._totalStakedAmount,
                (initStakedAmount*2)
            );

            await advanceTimeAndBlock(
                parseInt(timeToAdvance.toString())
            );

            //take snapshot of current state for testing
            await token.manualDailySnapshot({gas: 12000000});

            const manualSnapshotevent = await getLastEvent(
                "SnapshotCaptured",
                token
            );

            const globalsAfter = await token.globals();
            const initSnapshot = await token.snapshots(initFeyDay);
            const day2Snapshot = await token.snapshots(feyDay2);
            const day3Snapshot = await token.snapshots(feyDay3);

            //checks snapshot of initFeyDay total staked amount

            assert.equal(
                initSnapshot.totalStakedAmount.toString(),
                snapshotevent2._totalStakedAmount
            );

            //check days in between snapshots
            assert.equal(
                day2Snapshot.totalStakedAmount.toString(),
                snapshotevent3._totalStakedAmount.toString()
            );
            assert.equal(
                day3Snapshot.totalStakedAmount.toString(),
                manualSnapshotevent._totalStakedAmount.toString()
            );

            //check globals totalStaked was updated
            assert.equal(
                globalsBefore.totalStakedAmount.toString(),
                0
            );
            assert.equal(
                globalsAfter.totalStakedAmount.toString(),
                totalStakesAmount.toString()
            );
        });


        it("should reflect closed stakes on new snapshots, old snapshots should not be affected" , async () => {

            const timeToAdvance = await token.SECONDS_IN_DAY();
            const initFeyDay = await token.currentFeyDay();
            const feyDay2 = initFeyDay + 1;
            const feyDay3 = initFeyDay + 2;
            const initStakedAmount = web3.utils.toWei(
                '7000',
                'ether'
            );
            const finalStakedAmount = web3.utils.toWei(
                '7000',
                'ether'
            );

            const globalsBefore = await token.globals();

            //1st transaction
            await token.openStake(
                initStakedAmount
            );

            const snapshotevent1 = await getLastEvent(
                "SnapshotCaptured",
                token
            );

            assert.equal(
                snapshotevent1._totalStakedAmount,
                globalsBefore.totalStakedAmount.toString()
            );

            await advanceTimeAndBlock(
                parseInt(timeToAdvance.toString())
            );

            //--------------------------------------
            //2nd transaction

            await token.openStake(
                initStakedAmount
            );

            const firstStakingID = await getLastEvent(
                "StakeStart",
                token
            );

            const stakingIdDay1 = firstStakingID._stakingId;

            const snapshotevent2 = await getLastEvent(
                "SnapshotCaptured",
                token
            );

            assert.equal(
                snapshotevent2._totalStakedAmount,
                initStakedAmount
            );

            await advanceTimeAndBlock(
                parseInt(timeToAdvance.toString())
            );

            //--------------------------------------
            //3rd transaction
            await token.closeStake(
                stakingIdDay1
            );

            const snapshotevent3 = await getLastEvent(
                "SnapshotCaptured",
                token
            );

            assert.equal(
                snapshotevent3._totalStakedAmount,
                (initStakedAmount*2)
            );

            await advanceTimeAndBlock(
                parseInt(timeToAdvance.toString())
            );

            //take snapshot of current state for testing
            await token.manualDailySnapshot({gas: 12000000});

            const manualSnapshotevent = await getLastEvent(
                "SnapshotCaptured",
                token
            );

            const globalsAfter = await token.globals();
            const initSnapshot = await token.snapshots(initFeyDay);
            const day2Snapshot = await token.snapshots(feyDay2);
            const day3Snapshot = await token.snapshots(feyDay3);

            //checks snapshot of initFeyDay total staked amount
            assert.equal(
                initSnapshot.totalStakedAmount.toString(),
                snapshotevent2._totalStakedAmount
            );

            //check days in between snapshots
            assert.equal(
                day2Snapshot.totalStakedAmount.toString(),
                snapshotevent3._totalStakedAmount.toString()
            );

            assert.equal(
                day3Snapshot.totalStakedAmount.toString(),
                manualSnapshotevent._totalStakedAmount.toString()
            );

            //check closed stake is reflected in most recent snapshot
            assert.equal(
                manualSnapshotevent._totalStakedAmount.toString(),
                initStakedAmount
            );

            //check globals totalStaked was updated
            assert.equal(
                globalsBefore.totalStakedAmount.toString(),
                0
            );

            assert.equal(
                globalsAfter.totalStakedAmount.toString(),
                finalStakedAmount.toString()
            );
        });


        it("should return historical data for snapshots", async () => {

            const timeToAdvance = await token.SECONDS_IN_DAY();
            const initFeyDay = await token.currentFeyDay();

            const feyDay2 = initFeyDay + 1;
            const feyDay3 = initFeyDay + 2;

            const initStakedAmount = web3.utils.toWei(
                '2000',
                'ether'
            );

            const day1TotalStakesAmount = web3.utils.toWei(
                '6000',
                'ether'
            );

            const day2TotalStakesAmount = web3.utils.toWei(
                '12000',
                'ether'
            );

            const day2TotalStakesAfter1stClose = web3.utils.toWei(
                '10000',
                'ether'
            );

            const day2TotalStakesAfter2ndClose = web3.utils.toWei(
                '8000',
                'ether'
            );

            const day3TotalStakesAmount = web3.utils.toWei(
                '10000',
                'ether'
            );

            const globalsBefore = await token.globals();

            //1st day - 3 openStake transaction
            //1
            await token.openStake(
                initStakedAmount
            );

            const snapshotday1event1 = await getLastEvent(
                "SnapshotCaptured",
                token
            );

            assert.equal(
                snapshotday1event1._totalStakedAmount,
                globalsBefore.totalStakedAmount.toString()
            );

            const firstStakingID = await getLastEvent(
                "StakeStart",
                token
            );

            //2
            await token.openStake(
                initStakedAmount
            );

            const snapshotday1event2 = await getLastEvent(
                "SnapshotCaptured",
                token
            );

            assert.equal(
                snapshotday1event2._totalStakedAmount,
                initStakedAmount
            );

            const secondStakingID = await getLastEvent(
                "StakeStart",
                token
            );

            //3
            await token.openStake(
                initStakedAmount
            );

            const snapshotday1event3 = await getLastEvent(
                "SnapshotCaptured",
                token
            );

            assert.equal(
                snapshotday1event3._totalStakedAmount,
                (initStakedAmount*2)
            );

            await advanceTimeAndBlock(
                parseInt(timeToAdvance.toString())
            );

            //--------------------------------------
            //2nd day - 3 openStake transaction
            //1
            await token.openStake(
                initStakedAmount
            );

            const snapshotday2event1 = await getLastEvent(
                "SnapshotCaptured",
                token
            );

            assert.equal(
                snapshotday2event1._totalStakedAmount,
                day1TotalStakesAmount.toString()
            );

            //2
            await token.openStake(
                initStakedAmount
            );

            const snapshotday2event2 = await getLastEvent(
                "SnapshotCaptured",
                token
            );

            assert.equal(
                snapshotday2event2._totalStakedAmount,
                (initStakedAmount*4)
            );

            //3
            await token.openStake(
                initStakedAmount
            );

            const snapshotday2event3 = await getLastEvent(
                "SnapshotCaptured",
                token
            );

            assert.equal(
                snapshotday2event3._totalStakedAmount,
                (initStakedAmount*5)
            );

            await advanceTimeAndBlock(
                parseInt(timeToAdvance.toString())
            );

            //--------------------------------------
            //3rd day - 2 closeStake + 1 openStake transaction
            //1
            await token.closeStake(
                firstStakingID._stakingId
            );

            const snapshotday3event1 = await getLastEvent(
                "SnapshotCaptured",
                token
            );

            assert.equal(
                snapshotday3event1._totalStakedAmount,
                day2TotalStakesAmount.toString()
            );

            //2
            await token.closeStake(
                secondStakingID._stakingId
            );

            const snapshotday3event2 = await getLastEvent(
                "SnapshotCaptured",
                token
            );
            //closeStake should lower total totaleStakedAmount
            //const day3event2totalstaked = day2TotalStakesAmount-initStakedAmount;
            assert.equal(
                snapshotday3event2._totalStakedAmount.toString(),
                day2TotalStakesAfter1stClose
            );

            //3
            await token.openStake(
                initStakedAmount
            );
            const snapshotday3event3 = await getLastEvent(
                "SnapshotCaptured",
                token
            );

            assert.equal(
                snapshotday3event3._totalStakedAmount,
                day2TotalStakesAfter2ndClose
                //(day2TotalStakesAmount-initStakedAmount-initStakedAmount)
            );

            await advanceTimeAndBlock(
                parseInt(timeToAdvance.toString())
            );

            //take snapshot of current state for testing
            await token.manualDailySnapshot({gas: 12000000});

            const manualSnapshotevent = await getLastEvent(
                "SnapshotCaptured",
                token
            );
            assert.equal(
                manualSnapshotevent._totalStakedAmount,
                day3TotalStakesAmount
            );

            const globalsAfter = await token.globals();
            const initSnapshot = await token.snapshots(initFeyDay);
            const day2Snapshot = await token.snapshots(feyDay2);
            const day3Snapshot = await token.snapshots(feyDay3);

            //checks snapshot of initFeyDay total staked amount

            assert.equal(
                initSnapshot.totalStakedAmount.toString(),
                day1TotalStakesAmount
            );

            //check days in between snapshots
            assert.equal(
                day2Snapshot.totalStakedAmount.toString(),
                day2TotalStakesAmount
            );

            assert.equal(
                day3Snapshot.totalStakedAmount.toString(),
                manualSnapshotevent._totalStakedAmount.toString()
            );

            //check globals totalStaked was updated
            assert.equal(
                globalsBefore.totalStakedAmount.toString(),
                0
            );

            assert.equal(
                globalsAfter.totalStakedAmount.toString(),
                day3TotalStakesAmount.toString()
            );
        });

        it("should take snapshot of previous stake only (no manual screenshot at the end), but globals still update", async () => {

            const timeToAdvance = await token.SECONDS_IN_DAY();
            const initFeyDay = await token.currentFeyDay();
            const feyDay2 = initFeyDay + 1;

            const initStakedAmount = web3.utils.toWei(
                '7000',
                'ether'
            );

            const totalStakesAmount = web3.utils.toWei(
                '14000',
                'ether'
            );

            const globalsBefore = await token.globals();

            //1st transaction
            await token.openStake(
                initStakedAmount
            );

            const snapshotevent1 = await getLastEvent(
                "SnapshotCaptured",
                token
            );

            assert.equal(
                snapshotevent1._totalStakedAmount,
                globalsBefore.totalStakedAmount.toString()
            );

            await advanceTimeAndBlock(
                parseInt(timeToAdvance.toString())
            );

            //--------------------------------------
            //2nd transaction
            await token.openStake(
                initStakedAmount
            );

            const snapshotevent2 = await getLastEvent(
                "SnapshotCaptured",
                token
            );

            assert.equal(
                snapshotevent2._totalStakedAmount,
                initStakedAmount
            );

            await advanceTimeAndBlock(
                parseInt(timeToAdvance.toString())
            );

            const globalsAfter = await token.globals();
            const initSnapshot = await token.snapshots(initFeyDay);
            const day2Snapshot = await token.snapshots(feyDay2);

            //checks snapshot of initFeyDay total staked amount

            assert.equal(
                initSnapshot.totalStakedAmount.toString(),
                snapshotevent2._totalStakedAmount
            );

            //check days in between snapshots
            assert.equal(
                day2Snapshot.totalStakedAmount.toString(),
                0
            );

            //check globals totalStaked was updated
            assert.equal(
                globalsBefore.totalStakedAmount.toString(),
                0
            );
            assert.equal(
                globalsAfter.totalStakedAmount.toString(),
                totalStakesAmount.toString()
            );
        });
    });

    describe("Staking", () => {

        beforeEach(async () => {
            token = await Token.new();
        });

        it("should allow owner to closeGhostStake", async () => {

            const timeToAdvance = await token.SECONDS_IN_DAY();
            const maxStakeAge = await token.MAX_STAKE_DAYS();
            const maxTimeToAdvance = timeToAdvance * maxStakeAge;
            const initStakedAmount = web3.utils.toWei(
                '7000',
                'ether'
            );

            await token.openStake(
                initStakedAmount
            );

            const firstStakingID = await getLastEvent(
                "StakeStart",
                token
            );

            await advanceTimeAndBlock(
                parseInt(maxTimeToAdvance.toString()) + 30
            );

            const stakeAge = await token.getStakeAge(firstStakingID._stakingId);

            await token.closeGhostStake(
                firstStakingID._stakingId,
                { from: owner }
            );

            const closeGhostStakeEvent = await getLastEvent(
                "ClosedGhostStake",
                token
            );

            assert.equal(
                closeGhostStakeEvent.stakeId,
                firstStakingID._stakingId
            );
            assert.equal(
                closeGhostStakeEvent.daysOld,
                maxStakeAge
            );
        });

        it("should ONLY allow owner to call closeGhostStake", async () => {

            const timeToAdvance = await token.SECONDS_IN_DAY();
            const maxStakeAge = await token.MAX_STAKE_DAYS();
            const maxTimeToAdvance = timeToAdvance * maxStakeAge;
            const initStakedAmount = web3.utils.toWei(
                '7000',
                'ether'
            );

            await token.openStake(
                initStakedAmount
            );

            const firstStakingID = await getLastEvent(
                "StakeStart",
                token
            );

            await advanceTimeAndBlock(
                parseInt(maxTimeToAdvance.toString()) + parseInt(timeToAdvance.toString())
            );

            const stakeAge = await token.getStakeAge(firstStakingID._stakingId);

            await catchRevert(
                token.closeGhostStake(
                firstStakingID._stakingId,
                { from: user1 }),
                'revert Ownable: must be the owner'
            );
        });

        it("should not accrue interest after MAX_STAKE_AGE", async () => {

            const maxStakeAge = await token.MAX_STAKE_DAYS();
            const afterMaxDay = maxStakeAge.toNumber() + 1;
            const secondsInDay = await token.SECONDS_IN_DAY();
            const initStakedAmount = web3.utils.toWei(
                '7000',
                'ether'
            );

            const singleDayInterest = await token.getInterest(
                initStakedAmount,
                initStakedAmount,
                (secondsInDay)
            );
            const onMaxDayInterest = await token.getInterest(
                initStakedAmount,
                initStakedAmount,
                (secondsInDay*afterMaxDay)
            );

            await token.openStake(
                initStakedAmount,
                {from:owner}
            );

            await advanceTimeAndBlock(
                parseInt(secondsInDay.toString())
            );
            const day1Interest = await token.getStakeInterest(
                0
            );

            for(i = 0; i < maxStakeAge; i++) {
                await advanceTimeAndBlock(
                    parseInt(secondsInDay.toString())
                );
            }

            const oneDayAfterMaxInterest = await token.getStakeInterest(
                0
            );

            await advanceTimeAndBlock(
                parseInt(secondsInDay.toString())
            );
            const twoDaysAfterMaxInterest = await token.getStakeInterest(
                0
            );

            await advanceTimeAndBlock(
                parseInt(secondsInDay.toString())
            );
            const threeDaysAfterMaxInterest = await token.getStakeInterest(
                0
            );

            //check expected vs actual
            assert.equal(
                parseInt(singleDayInterest.toString()),
                parseInt(day1Interest.toString())
            );
            assert.equal(
                parseInt(onMaxDayInterest.toString()),
                parseInt(oneDayAfterMaxInterest.toString())
            );
            assert.equal(
                parseInt(onMaxDayInterest.toString()),
                parseInt(twoDaysAfterMaxInterest.toString())
            );
            assert.equal(
                parseInt(onMaxDayInterest.toString()),
                parseInt(threeDaysAfterMaxInterest.toString())
            );
        });

        it("should accrue interest before MAX_STAKE_AGE", async () => {

            const timeToAdvance = await token.SECONDS_IN_DAY();
            const secondsInDay = await token.SECONDS_IN_DAY();;

            const initStakedAmount = web3.utils.toWei(
                '7000',
                'ether'
            );

            const singleDayInterest = await token.getInterest(
                initStakedAmount,
                initStakedAmount,
                (secondsInDay)
            );

            const secondDayInterest = await token.getInterest(
                initStakedAmount,
                initStakedAmount,
                (secondsInDay*2)
            );

            const balanceAfter = totalSupplyDefault - initStakedAmount;
            const ownerbalancebefore = await token.balances(owner);

            await token.openStake(
                initStakedAmount,
                {from:owner}
            );

            const ownerbalanceAfter = await token.balances(owner);

            await advanceTimeAndBlock(
                parseInt(timeToAdvance.toString())
            );
            const day1Interest = await token.getStakeInterest(
                0
            );

            await advanceTimeAndBlock(
                parseInt(timeToAdvance.toString())
            );
            const day2Interest = await token.getStakeInterest(
                0
            );

            await advanceTimeAndBlock(
                parseInt(timeToAdvance.toString())
            );

            //check balances
            assert.equal(
                ownerbalancebefore.toString(),
                totalSupplyDefault
            );

            assert.equal(
                ownerbalanceAfter.toString(),
                balanceAfter
            );

            //check interest accrual
            assert.equal(
                parseInt(day1Interest.toString()),
                parseInt(singleDayInterest.toString())
            );
            assert.equal(
                parseInt(day2Interest.toString()),
                parseInt(secondDayInterest.toString())
            );
        });


        it("should not allow an openStake greater than totalSupply", async () => {

            const timeToAdvance = await token.SECONDS_IN_DAY();
            const initFeyDay = await token.currentFeyDay();

            const feyDay2 = initFeyDay + 1;
            const feyDay3 = initFeyDay + 2;
            const initStakedAmount = (totalSupplyDefault + web3.utils.toWei(
                '7000',
                'ether'
            ));

            const globalsBefore = await token.globals();

            //1st transaction
            await catchRevert(
                token.openStake(initStakedAmount),
                'revert FEYToken: exceeding balance'
            );

            await advanceTimeAndBlock(
                parseInt(timeToAdvance.toString())
            );
        });

        it("should apply stake penalty if closed under 4 FeyDays", async () => {

            const timeToAdvance = await token.SECONDS_IN_DAY();
            const initStakedAmount = (web3.utils.toWei(
                '7000',
                'ether'
            ));
            const expectedfinalbalance = web3.utils.toWei(
                '999999475000',
                'finney'
            );

            await token.openStake(
                initStakedAmount,
                {from:owner}
            );

            const firstStakingID = await getLastEvent(
                "StakeStart",
                token
            );

            await advanceTimeAndBlock(
                parseInt(timeToAdvance.toString())
            );

            await token.closeStake(
                firstStakingID._stakingId
            );

            await advanceTimeAndBlock(
                parseInt(timeToAdvance.toString())
            );

            const actualfinalBalance = await token.balances(owner);

            assert.equal(
                actualfinalBalance.toString(),
                expectedfinalbalance
            );
        });

        it("should not allow one user to close a Stake for another user", async () => {

            const timeToAdvance = await token.SECONDS_IN_DAY();
            const initStakedAmount = web3.utils.toWei(
                '7000',
                'ether'
            );

            await token.openStake(
                initStakedAmount,
                {from:owner}
            );

            const firstStakingID = await getLastEvent(
                "StakeStart",
                token
            );

            await advanceTimeAndBlock(
                parseInt(timeToAdvance.toString())
            );

            await catchRevert(
                token.closeStake(
                    firstStakingID._stakingId,
                    {from:user1}
                ),
                'revert FEYToken: wrong stake owner'
            );
        });

        it("should not allow user to open stake greater than their balance", async () => {

            const timeToAdvance = await token.SECONDS_IN_DAY();
            const tranferBalance = web3.utils.toWei(
                '7000',
                'ether'
            );

            const initStakedAmount = web3.utils.toWei(
                '900000000',
                'ether'
            );

            const ownerStakePostTransfer = totalSupplyDefault - tranferBalance;

            const user1balancebefore = await token.balances(user1);
            const ownerbalancebefore = await token.balances(owner);

            await token.transfer(user1, tranferBalance, {from: owner});

            const user1balanceFinal = await token.balances(user1);
            const ownerbalanceFinal = await token.balances(owner);

            //check that transfers were successful
            assert.equal(
                user1balancebefore.toString(),
                0
            );

            assert.equal(
                ownerbalancebefore.toString(),
                totalSupplyDefault
            );

            assert.equal(
                user1balanceFinal.toString(),
                tranferBalance
            );

            assert.equal(
                ownerbalanceFinal.toString(),
                ownerStakePostTransfer
            );

            await advanceTimeAndBlock(
                parseInt(timeToAdvance.toString())
            );

            //TEST: cannot open stake greater than balance
            await catchRevert(
                token.openStake(initStakedAmount, {from: user1}),
                'revert FEYToken: exceeding balance'
            );
        });

        it("should not allow user to open stake less than the MIN_STAKE", async () => {
            const timeToAdvance = await token.SECONDS_IN_DAY();
            const initStakedAmount = web3.utils.toWei(
                '1',
                'ether'
            );

            await catchRevert(
                token.openStake(initStakedAmount, {from: user1}),
                'revert FEYToken: exceeding balance'
            );
        });

        it("should debit from a user's balance when they open stake", async () => {
            const timeToAdvance = await token.SECONDS_IN_DAY();
            const initStakedAmount = web3.utils.toWei(
                '7000',
                'ether'
            );
            const balanceAfter = totalSupplyDefault - initStakedAmount;

            const ownerbalancebefore = await token.balances(owner);

            await token.openStake(
                initStakedAmount,
                {from:owner}
            );

            await advanceTimeAndBlock(
                parseInt(timeToAdvance.toString())
            );

            const ownerbalanceAfter = await token.balances(owner);

            assert.equal(
                ownerbalancebefore.toString(),
                totalSupplyDefault
            );

            assert.equal(
                ownerbalanceAfter.toString(),
                balanceAfter
            );
        });

        it("should credit to a user's balance when they close stake", async () => {

            const timeToAdvance = await token.SECONDS_IN_DAY();
            const initFeyDay = await token.currentFeyDay();
            const initStakedAmount = web3.utils.toWei(
                '7000',
                'ether'
            );

           const timeNoPenalty = timeToAdvance * 4;

            const balanceAfter = totalSupplyDefault - initStakedAmount;

            await token.transfer(user1,
                initStakedAmount,
                {from: owner}
            );

            const user1balancePostTransfer = await token.balanceOf(user1);
            const ownerbalancePostTransfer = await token.balanceOf(owner);

            await token.openStake(
                user1balancePostTransfer,
                {from: user1}
            );

            const firstStakingID = await getLastEvent(
                "StakeStart",
                token
            );

            await advanceTimeAndBlock(
                parseInt(timeNoPenalty.toString())
            );

            const user1balanceafterOpen = await token.balances(user1);

            await token.closeStake(
                firstStakingID._stakingId,
                {from: user1}
            );

            const user1balanceafterClose = await token.balances(user1);
            const ownerbalanceAfter = await token.balances(owner);

            const stakeListInterest = await token.stakeList(initFeyDay);
            const stakeWithInterest = (parseInt(user1balancePostTransfer)
                                    + parseInt(stakeListInterest.interestAmount));

            assert.equal(
                ownerbalancePostTransfer.toString(),
                totalSupplyDefault-(initStakedAmount)
            );
            assert.equal(
                user1balancePostTransfer.toString(),
                initStakedAmount
            );

            assert.equal(
                ownerbalanceAfter.toString(),
                balanceAfter,
                4
            );

            assert.equal(
                user1balanceafterOpen.toString(),
                0
            );

            assert.equal(
                parseFloat(user1balanceafterClose.toString()),
                parseFloat(stakeWithInterest.toString()),
                4
            );
        });

        it("revert if trying to close a stake again", async () => {

            const timeToAdvance = await token.SECONDS_IN_DAY();
            const initFeyDay = await token.currentFeyDay();
            const initStakedAmount = web3.utils.toWei(
                '7000',
                'ether'
            );

            const timeNoPenalty = timeToAdvance * 4;

            const balanceAfter = totalSupplyDefault - initStakedAmount;

            await token.transfer(user1,
                initStakedAmount,
                {from: owner}
            );

            const user1balancePostTransfer = await token.balanceOf(user1);
            const ownerbalancePostTransfer = await token.balanceOf(owner);

            await token.openStake(
                user1balancePostTransfer,
                {from: user1}
            );

            const firstStakingID = await getLastEvent(
                "StakeStart",
                token
            );

            await advanceTimeAndBlock(
                parseInt(timeNoPenalty.toString())
            );

            const user1balanceafterOpen = await token.balances(user1);

            await token.closeStake(
                firstStakingID._stakingId,
                {from: user1}
            );

            await catchRevert(
                token.closeStake(
                    firstStakingID._stakingId,
                    {from: user1}
                ),
                'revert FEYToken: stake not active'
            );
        });
    });

    describe("Token Transfer", () => {

        beforeEach(async () => {
            token = await Token.new();
        });

        it("should allow a user to transfer to themselves", async () => {

            const timeToAdvance = await token.SECONDS_IN_DAY();
            const transferAmount = web3.utils.toWei(
                '7000',
                'ether'
            );

            const user1balanceBeforeTransfer = await token.balanceOf(user1);
            const ownerbalanceBeforeTransfer = await token.balanceOf(owner);

            await token.transfer(
                owner,
                transferAmount,
                {from: owner}
            );

            await advanceTimeAndBlock(
                parseInt(timeToAdvance.toString())
            );

            const user1balancePostTransfer = await token.balanceOf(user1);
            const ownerbalancePostTransfer = await token.balanceOf(owner);

            assert.equal(
                ownerbalanceBeforeTransfer.toString(),
                totalSupplyDefault
            );
            assert.equal(
                user1balanceBeforeTransfer.toString(),
                0
            );

            assert.equal(
                ownerbalancePostTransfer.toString(),
                totalSupplyDefault
            );

            assert.equal(
                user1balancePostTransfer.toString(),
                0
            );
        });

        it("should allow a user to multiTransfer", async () => {

            const timeToAdvance = await token.SECONDS_IN_DAY();

            const transferAmountA = web3.utils.toWei(
                '5000',
                'ether'
            );

            const transferAmountB = web3.utils.toWei(
                '7000',
                'ether'
            );

            const ownerbalanceBeforeTransfer = await token.balanceOf(owner);

            await token.multiTransfer(
                [user1, user2],
                [transferAmountA, transferAmountB],
                {from: owner}
            );

            const user1Balance = await token.balanceOf(user1);
            const user2Balance = await token.balanceOf(user2);

            const ownerbalancePostTransfer = await token.balanceOf(owner);

            assert.equal(
                transferAmountA.toString(),
                user1Balance.toString()
            );

            assert.equal(
                transferAmountB.toString(),
                user2Balance.toString()
            );

            assert.equal(
                ownerbalancePostTransfer,
                (ownerbalanceBeforeTransfer - user1Balance - user2Balance)
            );
        });

        it("should allow a user to multiTransfer to themselves", async () => {

            const timeToAdvance = await token.SECONDS_IN_DAY();
            const transferAmount = web3.utils.toWei(
                '7000',
                'ether'
            );

            const ownerbalanceBeforeTransfer = await token.balanceOf(owner);

            await token.multiTransfer(
                [owner],
                [transferAmount],
                {from: owner}
            );


            await advanceTimeAndBlock(
                parseInt(timeToAdvance.toString())
            );

            const ownerbalancePostTransfer = await token.balanceOf(owner);

            assert.equal(
                ownerbalanceBeforeTransfer.toString(),
                totalSupplyDefault
            );

            assert.equal(
                ownerbalancePostTransfer.toString(),
                totalSupplyDefault
            );
        });

        it("should allow a user to transferFrom to themselves", async () => {

            const timeToAdvance = await token.SECONDS_IN_DAY();
            const transferAmount = web3.utils.toWei(
                '7000',
                'ether'
            );

            const ownerbalanceBeforeTransfer = await token.balanceOf(owner);

            await token.approve(
                owner,
                transferAmount,
                {from: owner}
            );

            await token.transferFrom(
                owner,
                owner,
                transferAmount,
                {from: owner}
            );

            await advanceTimeAndBlock(
                parseInt(timeToAdvance.toString())
            );


            const ownerbalancePostTransfer = await token.balanceOf(owner);

            assert.equal(
                ownerbalanceBeforeTransfer.toString(),
                totalSupplyDefault
            );

            assert.equal(
                ownerbalancePostTransfer.toString(),
                totalSupplyDefault
            );
        });

        it("should require approval of amount for transferFrom", async () => {

            const timeToAdvance = await token.SECONDS_IN_DAY();
            const initApprovalAmount = web3.utils.toWei(
                '5000',
                'ether'
            );
            const transferAmount = web3.utils.toWei(
                '7000',
                'ether'
            );

            const ownerbalanceBeforeTransfer = await token.balanceOf(owner);

            //1st test - transferFrom w/out approval
            await catchRevert(
                token.transferFrom(
                    owner,
                    owner,
                    transferAmount,
                    {from: owner}
                ),
                'revert Token: exceeding allowance'
            );

            //2nd test - approve amount < transfer amount, should revert
            await token.approve(
                owner,
                initApprovalAmount,
                {from: owner}
            );

            await catchRevert(
                token.transferFrom(
                    owner,
                    owner,
                    transferAmount,
                    {from: owner}
                ),
                'revert Token: exceeding allowance'
            );

            //3rd test - can transferFrom with proper approval
            await token.approve(
                owner,
                transferAmount,
                {from: owner}
            );

            await token.transferFrom(
                owner,
                owner,
                transferAmount,
                {from: owner}
            );

            await advanceTimeAndBlock(
                parseInt(timeToAdvance.toString())
            );

            const ownerbalancePostTransfer = await token.balanceOf(owner);

            assert.equal(
                ownerbalanceBeforeTransfer.toString(),
                totalSupplyDefault
            );

            assert.equal(
                ownerbalancePostTransfer.toString(),
                totalSupplyDefault
            );
        });

        it("should burn 0% of amount on transfer", async () => {

            const timeToAdvance = await token.SECONDS_IN_DAY();
            const transferAmount = web3.utils.toWei(
                '7000',
                'ether'
            );

            const balanceAfter = totalSupplyDefault - transferAmount;

            await token.transfer(user1, transferAmount, {from: owner});

            await advanceTimeAndBlock(
                parseInt(timeToAdvance.toString())
            );

            const user1balancePostTransfer = await token.balanceOf(user1);
            const ownerbalancePostTransfer = await token.balanceOf(owner);

            assert.equal(
                ownerbalancePostTransfer.toString(),
                balanceAfter
            );

            assert.equal(
                user1balancePostTransfer.toString(),
                transferAmount
            );

        });

        it("should burn 0% of amount on transferFrom", async () => {

            const timeToAdvance = await token.SECONDS_IN_DAY();
            const transferAmount = web3.utils.toWei(
                '7000',
                'ether'
            );

            const balanceAfter = totalSupplyDefault - transferAmount;

            await token.approve(
                user2,
                transferAmount,
                {from: owner}
            );

            await token.transferFrom(
                owner,
                user1,
                transferAmount,
                {from: user2}
            );
            await advanceTimeAndBlock(
                parseInt(timeToAdvance.toString())
            );

            const user1balancePostTransfer = await token.balanceOf(user1);
            const ownerbalancePostTransfer = await token.balanceOf(owner);

            assert.equal(
                ownerbalancePostTransfer.toString(),
                balanceAfter
            );

            assert.equal(
                user1balancePostTransfer.toString(),
                transferAmount
            );

        });

        it("should burn 0% of amount on multiTransfer", async () => {

            const timeToAdvance = await token.SECONDS_IN_DAY();
            const transferAmount = web3.utils.toWei(
                '7000',
                'ether'
            );

            await token.multiTransfer(
                [owner],
                [transferAmount],
                {from: owner}
            );

            await advanceTimeAndBlock(
                parseInt(timeToAdvance.toString())
            );

            const ownerbalancePostTransfer = await token.balanceOf(owner);

            assert.equal(
                parseFloat(ownerbalancePostTransfer.toString()),
                parseFloat(totalSupplyDefault)
            );
        });

        it("should be applying the allowances mechanism with transferFrom()", async () => {

            const timeToAdvance = await token.SECONDS_IN_DAY();
            const approvalAmount = 1000;
            const transferAmount = 500;

            const preAllowance = await token.allowance(owner, user2);

            const balanceAfter = totalSupplyDefault - transferAmount;

            await token.approve(
                user2,
                approvalAmount,
                {from: owner}
            );

            await token.transferFrom(
                owner,
                user1,
                transferAmount,
                {from: user2}
            );
            await advanceTimeAndBlock(
                parseInt(timeToAdvance.toString())
            );

            const user1balancePostTransfer = await token.balanceOf(user1);
            const ownerbalancePostTransfer = await token.balanceOf(owner);

            const postAllowance = await token.allowance(owner, user2);

            //allowances check
            assert.equal(
                preAllowance.toString(),
                0
            );
            assert.equal(
                postAllowance.toString(),
                transferAmount
            );

            assert.equal(
                ownerbalancePostTransfer.toString(),
                balanceAfter
            );

            assert.equal(
                user1balancePostTransfer.toString(),
                transferAmount
            );
        });
    });
});
